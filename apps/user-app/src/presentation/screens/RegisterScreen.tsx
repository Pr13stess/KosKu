import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ScreenProps } from "../../navigation/types";
import { useRepositories } from "../../providers/RepositoryProvider";
import { Button } from "../components/Primitives";
import { colors } from "../theme";
export function RegisterScreen({ navigation }: ScreenProps<"Register">) {
  const { auth, mode } = useRepositories();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setError(null);
    setNotice(null);
    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setSubmitting(true);
    try {
      await auth.signUp(email, password);
      if (mode === "supabase") {
        // Supabase may require email confirmation depending on project
        // settings; either way there is no session to react to yet.
        setNotice(
          "Pendaftaran berhasil. Periksa email untuk verifikasi, lalu masuk.",
        );
      }
      // In mock mode, signUp already opens a session; RootNavigator
      // swaps to the app stack on its own.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mendaftar.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Buat akun KosKu</Text>
          <Text style={styles.subtitle}>
            Dipakai untuk menyimpan pilihan sewa dan riwayat booking.
          </Text>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="nama@email.com"
              placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Kata sandi</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Minimal 6 karakter"
              placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Ulangi kata sandi</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
            />
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          {notice && <Text style={styles.notice}>{notice}</Text>}
          <Button
            title={submitting ? "Memproses…" : "Daftar"}
            onPress={submit}
            disabled={submitting || !email || !password || !confirm}
          />
          <Button
            title="Sudah punya akun? Masuk"
            onPress={() => navigation.navigate("Login")}
            secondary
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 14,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  field: { gap: 6 },
  label: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  error: { fontSize: 12, color: colors.danger },
  notice: { fontSize: 12, color: colors.green },
});
