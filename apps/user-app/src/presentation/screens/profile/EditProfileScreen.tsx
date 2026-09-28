import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { ScreenProps } from "../../../navigation/types";
import { useRepositories } from "../../../providers/RepositoryProvider";
import { useProfile } from "../../hooks/useProfile";
import { ActionButton, Avatar, ErrorState, Field } from "../../components/ProfileUi";
import {
  validateProfileUpdate,
  type FieldErrors,
  type ProfileUpdate,
} from "../../../domain/profile";
import { colors } from "../../theme";

export function EditProfileScreen({ navigation }: ScreenProps<"EditProfile">) {
  const { profiles } = useRepositories();
  const { profile, loading, error, reload, setProfile } = useProfile();
  const [form, setForm] = useState<ProfileUpdate | null>(null);
  const [errors, setErrors] = useState<FieldErrors<ProfileUpdate>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile && !form)
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        campus_or_company: profile.campus_or_company ?? "",
      });
  }, [profile, form]);

  if (loading && !profile)
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  if (error && !profile) return <ErrorState message={error} onRetry={reload} />;
  if (!profile || !form) return null;

  const set = (key: keyof ProfileUpdate) => (value: string) =>
    setForm({ ...form, [key]: value });

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setUploading(true);
    try {
      setProfile(
        await profiles.uploadAvatar({
          uri: asset.uri,
          mimeType: asset.mimeType ?? "image/jpeg",
        }),
      );
    } catch (e) {
      Alert.alert(
        "Foto gagal diunggah",
        e instanceof Error ? e.message : "Coba lagi.",
      );
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const found = validateProfileUpdate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await profiles.updateProfile(form);
      navigation.goBack();
    } catch (e) {
      Alert.alert(
        "Perubahan belum tersimpan",
        e instanceof Error ? e.message : "Coba lagi.",
      );
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.avatarBlock}>
          <Avatar uri={profile.avatar_url} name={form.full_name} size={96} />
          <Pressable
            accessibilityRole="button"
            onPress={pickAvatar}
            disabled={uploading}
            style={s.avatarAction}
          >
            {uploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={s.avatarActionText}>Ganti foto</Text>
            )}
          </Pressable>
        </View>

        <Field
          label="Email"
          value={profile.email ?? ""}
          editable={false}
          style={{ color: colors.muted }}
        />
        <Field
          label="Nama lengkap"
          value={form.full_name}
          onChangeText={set("full_name")}
          error={errors.full_name}
          autoCapitalize="words"
          textContentType="name"
        />
        <Field
          label="Nomor HP"
          value={form.phone}
          onChangeText={set("phone")}
          error={errors.phone}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          placeholder="081234567890"
        />
        <Field
          label="Kampus atau kantor (opsional)"
          value={form.campus_or_company}
          onChangeText={set("campus_or_company")}
          error={errors.campus_or_company}
        />

        <ActionButton title="Simpan perubahan" loading={saving} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 40 },
  avatarBlock: { alignItems: "center", marginBottom: 24, gap: 8 },
  avatarAction: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 36 },
  avatarActionText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
});
