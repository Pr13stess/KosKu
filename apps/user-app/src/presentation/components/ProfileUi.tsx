import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { colors, radius } from "../theme";

export function Avatar({
  uri,
  name,
  size = 72,
}: {
  uri: string | null;
  name: string | null;
  size?: number;
}) {
  const initials =
    (name ?? "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri)
    return (
      <Image
        source={{ uri }}
        style={[box, { backgroundColor: colors.soft }]}
        accessibilityLabel="Foto profil"
      />
    );
  return (
    <View style={[box, s.avatarFallback]}>
      <Text style={[s.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

export function Field({
  label,
  error,
  style,
  ...input
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[s.input, error ? s.inputError : null, style]}
        {...input}
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function ActionButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline";
}) {
  const off = disabled || loading;
  const outline = variant === "outline";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={onPress}
      style={[s.button, outline ? s.buttonOutline : null, off ? s.buttonOff : null]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? colors.primary : "#fff"} />
      ) : (
        <Text style={[s.buttonText, outline ? s.buttonTextOutline : null]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function MenuSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

export function MenuRow({
  label,
  onPress,
  danger = false,
  last = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[s.row, last ? null : s.rowDivider]}
    >
      <Text style={[s.rowText, danger ? { color: colors.danger } : null]}>
        {label}
      </Text>
      <Text style={s.chevron}>›</Text>
    </Pressable>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={s.center}>
      <Text style={s.errorTitle}>Profil tidak bisa dimuat</Text>
      <Text style={s.errorBody}>{message}</Text>
      <ActionButton title="Coba lagi" onPress={onRetry} />
    </View>
  );
}

const s = StyleSheet.create({
  avatarFallback: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700" },
  fieldWrap: { marginBottom: 16 },
  label: { color: colors.ink, fontWeight: "600", marginBottom: 6, fontSize: 14 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 13, marginTop: 4 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonOff: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  buttonTextOutline: { color: colors.primary },
  section: { marginTop: 20 },
  sectionTitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowText: { color: colors.ink, fontSize: 15 },
  chevron: { color: colors.muted, fontSize: 22 },
  center: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  errorTitle: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  errorBody: { color: colors.muted, fontSize: 14, marginBottom: 4 },
});
