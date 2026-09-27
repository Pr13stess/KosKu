import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../theme";
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        disabled && s.disabled,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: colors.primary }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      style={[s.chip, selected && s.chipActive]}
    >
      <Text style={[s.chipText, selected && { color: colors.surface }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Section({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
export function Status({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={s.status}>
      {loading ? (
        <>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.muted}>Memuat kos pilihanmu…</Text>
        </>
      ) : (
        <>
          <Text style={s.sectionTitle}>
            {error ? "Belum bisa memuat data" : (empty ?? "Belum ada data")}
          </Text>
          {error && <Text style={s.muted}>{error}</Text>}
          {onRetry && <Button title="Coba lagi" onPress={onRetry} secondary />}
        </>
      )}
    </View>
  );
}
export function FeatureGrid({ items }: { items: string[] }) {
  return (
    <View style={s.features}>
      {items.map((item) => (
        <View key={item} style={s.feature}>
          <View style={s.featureMark}>
            <Text style={{ color: colors.primary, fontSize: 12 }}>✓</Text>
          </View>
          <Text style={s.featureText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
export const s = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  secondary: { backgroundColor: colors.soft },
  disabled: { opacity: 0.4 },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  section: { gap: 12, marginBottom: 26 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  muted: { fontSize: 12, lineHeight: 19, color: colors.muted },
  status: { padding: 32, gap: 16, alignItems: "center" },
  features: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  feature: { width: "47%", flexDirection: "row", gap: 8, alignItems: "center" },
  featureMark: {
    height: 27,
    width: 27,
    borderRadius: 6,
    backgroundColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { fontSize: 11, color: colors.ink, flex: 1 },
});
