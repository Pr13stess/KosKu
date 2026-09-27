import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Listing, DurationUnit } from "../../domain/models";
import { PropertyImage } from "./PropertyImage";
import { colors } from "../theme";
import { rupiah, genderLabel, periodLabel, distanceLabel } from "../format";
export function PropertyCard({
  item,
  unit,
  value,
  onPress,
}: {
  item: Listing;
  unit: DurationUnit;
  value: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Lihat ${item.name}`}
      onPress={onPress}
      style={styles.card}
    >
      <View>
        <PropertyImage uri={item.images[0]} style={styles.photo} />
        <View style={styles.gender}>
          <Text style={styles.genderText}>{genderLabel(item.gender_type)}</Text>
        </View>
        <View style={styles.price}>
          <Text style={styles.priceText}>{rupiah(item.starting_price)}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.period}>
          Mulai dari / {periodLabel(unit, value)}
        </Text>
        <Text numberOfLines={2} style={styles.name}>
          {item.name}
        </Text>
        <Text style={styles.city}>{item.city}</Text>
        <Text style={styles.distance} numberOfLines={2}>
          {distanceLabel(item.distance_km)}
        </Text>
        <Text numberOfLines={2} style={styles.description}>
          {item.description}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.rating}>
            ★ {item.review_count ? item.rating.toFixed(1) : "Baru"}{" "}
            <Text style={styles.period}>({item.review_count})</Text>
          </Text>
          <Text
            style={[
              styles.stock,
              item.matching_available === 0 && { color: colors.muted },
            ]}
          >
            {item.matching_available
              ? `${item.matching_available} tersedia`
              : "Penuh"}
          </Text>
        </View>
        <View style={styles.tags}>
          {item.facilities.slice(0, 2).map((x) => (
            <Text style={styles.tag} key={x}>
              {x}
            </Text>
          ))}
        </View>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 9,
    overflow: "hidden",
    flex: 1,
    borderWidth: 1,
    borderColor: "#EEECE7",
  },
  photo: { height: 117 },
  gender: {
    position: "absolute",
    top: 8,
    left: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  genderText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  price: {
    position: "absolute",
    bottom: 0,
    left: 0,
    backgroundColor: colors.primary,
    paddingVertical: 5,
    paddingLeft: 9,
    paddingRight: 13,
    borderTopRightRadius: 12,
  },
  priceText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  content: { padding: 10, gap: 4 },
  period: { fontSize: 9, color: colors.muted },
  name: { fontSize: 14, fontWeight: "700", color: colors.ink, lineHeight: 19 },
  city: { fontSize: 11, color: colors.muted },
  distance: { fontSize: 9, lineHeight: 13, color: colors.muted, minHeight: 26 },
  description: { fontSize: 10, lineHeight: 14, color: colors.muted },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
    gap: 2,
  },
  rating: { fontSize: 10, color: colors.orange, fontWeight: "700" },
  stock: { fontSize: 9, color: colors.green },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 5 },
  tag: {
    backgroundColor: colors.soft,
    padding: 5,
    borderRadius: 4,
    color: colors.muted,
    fontSize: 9,
  },
});
