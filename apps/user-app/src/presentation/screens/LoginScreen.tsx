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
export function LoginScreen({ navigation }: ScreenProps<"Login">) {
  const { auth, mode } = useRepositories();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await auth.signIn(email, password);
      // No navigation.navigate() here: RootNavigator swaps stacks the
      // moment useAuthSession picks up the new session.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal masuk.");
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
          <Text style={styles.title}>Masuk ke KosKu</Text>
          <Text style={styles.subtitle}>
            {mode === "mock"
              ? "Mode demo: daftar akun baru dulu jika belum punya, data tidak tersimpan permanen."
              : "Gunakan email dan kata sandi akunmu."}
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
              autoComplete="password"
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
            />
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <Button
            title={submitting ? "Memproses…" : "Masuk"}
            onPress={submit}
            disabled={submitting || !email || !password}
          />
          <Button
            title="Belum punya akun? Daftar"
            onPress={() => navigation.navigate("Register")}
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
});
