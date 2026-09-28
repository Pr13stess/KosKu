import type { Profile, ProfileUpdate } from "../profile";

export interface AvatarFile {
  uri: string;
  mimeType: string;
}

export interface ProfileRepository {
  getMyProfile(): Promise<Profile>;
  updateProfile(input: ProfileUpdate): Promise<Profile>;
  uploadAvatar(file: AvatarFile): Promise<Profile>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
}
