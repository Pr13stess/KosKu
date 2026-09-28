import {
  sanitizeProfileUpdate,
  type Profile,
  type ProfileUpdate,
} from "../../domain/profile";
import type {
  AvatarFile,
  ProfileRepository,
} from "../../domain/repositories/ProfileRepository";

export class MockProfileRepository implements ProfileRepository {
  private profile: Profile = {
    id: "mock-user",
    email: "demo@kosku.test",
    full_name: "Pengguna Demo",
    phone: "081234567890",
    campus_or_company: null,
    avatar_url: null,
    roles: ["USER"],
  };

  async getMyProfile(): Promise<Profile> {
    return { ...this.profile, roles: [...this.profile.roles] };
  }

  async updateProfile(input: ProfileUpdate): Promise<Profile> {
    const v = sanitizeProfileUpdate(input);
    this.profile = {
      ...this.profile,
      full_name: v.full_name,
      phone: v.phone,
      campus_or_company: v.campus_or_company || null,
    };
    return this.getMyProfile();
  }

  async uploadAvatar(file: AvatarFile): Promise<Profile> {
    this.profile = { ...this.profile, avatar_url: file.uri };
    return this.getMyProfile();
  }

  async changePassword(currentPassword: string): Promise<void> {
    if (!currentPassword) throw new Error("Password saat ini salah.");
  }
}
