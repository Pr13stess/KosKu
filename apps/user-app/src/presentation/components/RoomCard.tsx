import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Room } from "../../domain/models";
import { colors } from "../theme";
import { rupiah, periodLabel } from "../format";
import { FeatureGrid } from "./Primitives";
export function RoomCard({
  room,
  selected = false,
  onPress,
  compact = false,
}: {
  room: Room;
  selected?: boolean;
  onPress?: () => void;
  compact?: boolean;
}) {
  const available = room.available > 0;
  const plan =
    room.plans.find(
      (p) => p.duration_unit === "MONTH" && p.duration_value === 1,
    ) ?? room.plans[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${room.name}, ${available ? `${room.available} tersedia` : "penuh"}`}
      accessibilityState={{ disabled: !available, selected }}
      disabled={!available || !onPress}
      onPress={onPress}
      style={[
        styles.card,
        selected && styles.selected,
        !available && styles.full,
      ]}
    >
      <View style={styles.top}>
        {compact && (
          <View style={styles.thumb}>
            <Text style={styles.thumbText}>⌂</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={styles.name}>{room.name}</Text>
          <Text style={styles.meta}>
            {room.room_size_m2} m² ·{" "}
            {room.bathroom_type === "PRIVATE"
              ? "Kamar mandi dalam"
              : "Kamar mandi luar"}
          </Text>
          <Text style={styles.price}>
            {plan
              ? `${rupiah(plan.price)} / ${periodLabel(plan.duration_unit, plan.duration_value)}`
              : "Paket belum tersedia"}
          </Text>
        </View>
        {selected && <Text style={styles.check}>●</Text>}
      </View>
      {!compact && <FeatureGrid items={room.facilities} />}
      <Text style={[styles.stock, !available && { color: colors.muted }]}>
        {available
          ? `Tersedia ${room.available} unit`
          : "Penuh · belum bisa dipilih"}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 14,
    gap: 14,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
    borderWidth: 2,
    padding: 13,
  },
  full: { opacity: 0.48 },
  top: { flexDirection: "row", gap: 12, alignItems: "center" },
  name: { fontWeight: "700", fontSize: 14, color: colors.ink },
  meta: { fontSize: 10, color: colors.muted },
  price: { fontSize: 12, fontWeight: "700", color: colors.primary },
  stock: { fontSize: 10, color: colors.green, textAlign: "right" },
  thumb: {
    width: 62,
    height: 62,
    borderRadius: 9,
    backgroundColor: colors.soft,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbText: { fontSize: 36, color: colors.muted },
  check: { fontSize: 17, color: colors.primary },
});
