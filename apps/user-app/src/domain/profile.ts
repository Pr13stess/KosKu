export type UserRole = "USER" | "OWNER" | "ADMIN";
export const USER_ROLES: readonly UserRole[] = ["USER", "OWNER", "ADMIN"];

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  campus_or_company: string | null;
  avatar_url: string | null;
  roles: UserRole[];
}

export interface SignUpMetadata {
  full_name: string;
  phone: string;
  campus: string;
  policy_version?: string;
}

export interface ProfileUpdate {
  full_name: string;
  phone: string;
  campus_or_company: string;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const PHONE = /^(\+62|62|0)8\d{8,12}$/;

export function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, "");
}

export function sanitizeProfileUpdate(input: ProfileUpdate): ProfileUpdate {
  return {
    full_name: input.full_name.trim(),
    phone: normalizePhone(input.phone),
    campus_or_company: input.campus_or_company.trim(),
  };
}

export function validateProfileUpdate(
  input: ProfileUpdate,
): FieldErrors<ProfileUpdate> {
  const v = sanitizeProfileUpdate(input);
  const errors: FieldErrors<ProfileUpdate> = {};
  if (v.full_name.length < 2) errors.full_name = "Nama minimal 2 karakter.";
  else if (v.full_name.length > 120)
    errors.full_name = "Nama maksimal 120 karakter.";
  if (!PHONE.test(v.phone))
    errors.phone = "Nomor HP tidak valid. Contoh: 081234567890.";
  if (v.campus_or_company.length > 150)
    errors.campus_or_company = "Maksimal 150 karakter.";
  return errors;
}

export function validatePasswordChange(
  input: PasswordChange,
): FieldErrors<PasswordChange> {
  const errors: FieldErrors<PasswordChange> = {};
  if (!input.current_password)
    errors.current_password = "Masukkan password saat ini.";
  if (input.new_password.length < 8)
    errors.new_password = "Password baru minimal 8 karakter.";
  else if (input.new_password === input.current_password)
    errors.new_password = "Password baru harus berbeda dari yang lama.";
  if (input.confirm_password !== input.new_password)
    errors.confirm_password = "Konfirmasi tidak sama dengan password baru.";
  return errors;
}
