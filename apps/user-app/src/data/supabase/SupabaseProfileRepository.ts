import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  USER_ROLES,
  sanitizeProfileUpdate,
  type Profile,
  type ProfileUpdate,
  type UserRole,
} from "../../domain/profile";
import type {
  AvatarFile,
  ProfileRepository,
} from "../../domain/repositories/ProfileRepository";

const BUCKET = "avatars";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  campus_or_company: string | null;
  avatar_path: string | null;
}

function isRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" && (USER_ROLES as readonly string[]).includes(value)
  );
}

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async currentUser(): Promise<User> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw new Error("Sesi berakhir. Silakan masuk lagi.");
    return data.user;
  }

  private avatarUrl(path: string | null): string | null {
    if (!path) return null;
    return this.client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  private async load(user: User): Promise<Profile> {
    const [profile, roles] = await Promise.all([
      this.client
        .from("profiles")
        .select("id, full_name, phone, campus_or_company, avatar_path")
        .eq("id", user.id)
        .maybeSingle(),
      this.client.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    if (profile.error || roles.error) throw new Error("Gagal memuat profil.");
    const row = profile.data as ProfileRow | null;
    if (!row)
      throw new Error(
        "Profil belum dibuat. Jalankan migrasi 202609280001_profile_bootstrap.sql.",
      );
    return {
      id: row.id,
      email: user.email ?? null,
      full_name: row.full_name,
      phone: row.phone,
      campus_or_company: row.campus_or_company,
      avatar_url: this.avatarUrl(row.avatar_path),
      roles: (roles.data ?? []).map((r) => r.role as unknown).filter(isRole),
    };
  }

  async getMyProfile(): Promise<Profile> {
    return this.load(await this.currentUser());
  }

  async updateProfile(input: ProfileUpdate): Promise<Profile> {
    const user = await this.currentUser();
    const v = sanitizeProfileUpdate(input);
    const { data, error } = await this.client
      .from("profiles")
      .update({
        full_name: v.full_name,
        phone: v.phone,
        campus_or_company: v.campus_or_company || null,
      })
      .eq("id", user.id)
      .select("id");
    if (error || !data?.length) throw new Error("Gagal menyimpan profil.");
    return this.load(user);
  }

  async uploadAvatar(file: AvatarFile): Promise<Profile> {
    const ext = EXTENSIONS[file.mimeType];
    if (!ext) throw new Error("Format foto harus JPEG, PNG, atau WebP.");
    const user = await this.currentUser();

    const body = await (await fetch(file.uri)).arrayBuffer();
    if (body.byteLength > MAX_AVATAR_BYTES)
      throw new Error("Ukuran foto maksimal 5 MB.");

    const bucket = this.client.storage.from(BUCKET);
    const path = `${user.id}/${Date.now()}.${ext}`;
    const uploaded = await bucket.upload(path, body, {
      contentType: file.mimeType,
      upsert: false,
    });
    if (uploaded.error) throw new Error("Gagal mengunggah foto.");

    const before = await this.client
      .from("profiles")
      .select("avatar_path")
      .eq("id", user.id)
      .maybeSingle();
    const updated = await this.client
      .from("profiles")
      .update({ avatar_path: path })
      .eq("id", user.id)
      .select("id");
    if (updated.error || !updated.data?.length) {
      await bucket.remove([path]);
      throw new Error("Gagal menyimpan foto profil.");
    }

    const oldPath = (before.data as { avatar_path: string | null } | null)
      ?.avatar_path;
    if (oldPath && oldPath !== path) await bucket.remove([oldPath]);
    return this.load(user);
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.currentUser();
    if (!user.email) throw new Error("Akun ini tidak memiliki email.");
    const check = await this.client.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (check.error) throw new Error("Password saat ini salah.");
    const { error } = await this.client.auth.updateUser({
      password: newPassword,
    });
    if (error) throw new Error("Gagal mengubah password. Coba lagi.");
  }
}
