import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import type { ScreenProps } from "../../../navigation/types";
import { useRepositories } from "../../../providers/RepositoryProvider";
import { ActionButton, Field } from "../../components/ProfileUi";
import {
  validatePasswordChange,
  type FieldErrors,
  type PasswordChange,
} from "../../../domain/profile";
import { colors } from "../../theme";

const EMPTY: PasswordChange = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

export function ChangePasswordScreen({ navigation }: ScreenProps<"ChangePassword">) {
  const { profiles } = useRepositories();
  const [form, setForm] = useState<PasswordChange>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<PasswordChange>>({});
  const [saving, setSaving] = useState(false);

  const set = (key: keyof PasswordChange) => (value: string) =>
    setForm({ ...form, [key]: value });

  const submit = async () => {
    const found = validatePasswordChange(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await profiles.changePassword(form.current_password, form.new_password);
      Alert.alert("Password diubah", "Gunakan password baru saat masuk berikutnya.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Coba lagi.";
      if (message.includes("saat ini"))
        setErrors({ current_password: message });
      else Alert.alert("Password belum diubah", message);
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
        <Field
          label="Password saat ini"
          value={form.current_password}
          onChangeText={set("current_password")}
          error={errors.current_password}
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
        />
        <Field
          label="Password baru"
          value={form.new_password}
          onChangeText={set("new_password")}
          error={errors.new_password}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
        />
        <Field
          label="Ulangi password baru"
          value={form.confirm_password}
          onChangeText={set("confirm_password")}
          error={errors.confirm_password}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
        />
        <ActionButton title="Ubah password" loading={saving} onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({ content: { padding: 16, paddingBottom: 40 } });
