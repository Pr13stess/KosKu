import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { defaultQuery } from "../../domain/models";
import { useRepositories } from "../../providers/RepositoryProvider";
import type { ScreenProps } from "../../navigation/types";
import { useResource } from "../hooks/useResource";
import { colors } from "../theme";
import { PropertyCard } from "../components/PropertyCard";
import { Status, Button } from "../components/Primitives";
import { FilterSheet } from "../components/FilterSheet";
import { LocationSheet } from "../components/LocationSheet";
import { Sheet } from "../components/Sheet";
export function HomeScreen({ navigation }: ScreenProps<"Home">) {
  const { properties, mode } = useRepositories();
  const [query, setQuery] = useState(defaultQuery),
    [text, setText] = useState(""),
    [sheet, setSheet] = useState<"filter" | "location" | "future" | null>(null);
  const loader = useCallback(
    () => properties.search(query),
    [properties, query],
  );
  const { data, loading, error, retry } = useResource(loader);
  const active = !!(
    query.gender ||
    query.minRating ||
    query.roomFacilities.length ||
    query.propertyFacilities.length ||
    query.minPrice ||
    query.maxPrice < 1e9 ||
    query.maxDistance ||
    query.durationUnit !== "MONTH" ||
    query.durationValue !== 1
  );
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.logo}>⌂</Text>
            <Text style={styles.brandName}>KosKu</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifikasi, belum tersedia"
            onPress={() => setSheet("future")}
            style={styles.notification}
          >
            <Text style={{ fontSize: 11, color: "#fff" }}>Notif</Text>
          </Pressable>
        </View>
        <View style={styles.search}>
          <TextInput
            accessibilityLabel="Cari nama kos atau area"
            style={styles.searchInput}
            placeholder="Cari nama kos atau area…"
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={setText}
            onSubmitEditing={() =>
              setQuery({ ...query, text: text.trim(), page: 0 })
            }
            returnKeyType="search"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cari"
            onPress={() => setQuery({ ...query, text: text.trim(), page: 0 })}
            style={styles.searchButton}
          >
            <Text style={styles.searchText}>Cari</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSheet("location")}
          style={styles.location}
        >
          <Text style={styles.pin}>⌖</Text>
          <Text numberOfLines={1} style={styles.locationText}>
            {query.reference?.label ?? "Pilih lokasi acuanmu"}
          </Text>
          <Text style={styles.chevron}>⌄</Text>
        </Pressable>
        <View style={styles.toolbar}>
          <View style={styles.tools}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buka filter"
              onPress={() => setSheet("filter")}
              style={styles.tool}
            >
              <Text style={styles.toolText}>▽ {active ? "•" : ""}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buka urutkan"
              onPress={() => setSheet("filter")}
              style={styles.tool}
            >
              <Text style={styles.toolText}>≡</Text>
            </Pressable>
            <Text style={styles.resultLabel}>
              {active ? "Filter aktif" : "Pilihan untukmu"}
            </Text>
          </View>
          {mode === "mock" && <Text style={styles.demo}>DATA DEMO</Text>}
        </View>
        {loading || error ? (
          <View style={{ flex: 1 }}>
            <Status
              loading={loading}
              error={error}
              onRetry={error ? retry : undefined}
            />
          </View>
        ) : (
          <FlatList
            data={data ?? []}
            numColumns={2}
            keyExtractor={(item) => item.id}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <PropertyCard
                item={item}
                unit={query.durationUnit}
                value={query.durationValue}
                onPress={() =>
                  navigation.navigate("PropertyDetail", { propertyId: item.id })
                }
              />
            )}
            ListEmptyComponent={
              <Status
                empty="Belum ada kos yang cocok"
                onRetry={() => {
                  setQuery(defaultQuery);
                  setText("");
                }}
              />
            }
            ListFooterComponent={
              <View style={styles.pagination}>
                {query.page > 0 && (
                  <Button
                    secondary
                    title="Sebelumnya"
                    onPress={() => setQuery({ ...query, page: query.page - 1 })}
                  />
                )}
                <Text style={styles.resultLabel}>Halaman {query.page + 1}</Text>
                {data?.length === 20 && (
                  <Button
                    secondary
                    title="Berikutnya"
                    onPress={() => setQuery({ ...query, page: query.page + 1 })}
                  />
                )}
              </View>
            }
          />
        )}
        <View style={styles.dock}>
          {[
            { icon: "⌂", label: "Home" },
            { icon: "☷", label: "Chat" },
            { icon: "▣", label: "Booking" },
            { icon: "◎", label: "Profil" },
          ].map((item, i) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => (i === 0 ? undefined : setSheet("future"))}
              style={styles.dockItem}
            >
              <View style={[styles.dockIcon, i === 0 && styles.dockActive]}>
                <Text style={[styles.navSymbol, i === 0 && { color: "#fff" }]}>
                  {item.icon}
                </Text>
              </View>
              <Text
                style={[
                  styles.dockLabel,
                  i === 0 && { color: colors.primary, fontWeight: "700" },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {sheet === "filter" && (
          <FilterSheet
            query={query}
            onClose={() => setSheet(null)}
            onApply={(q) => {
              setQuery(q);
              setSheet(null);
            }}
          />
        )}
        {sheet === "location" && (
          <LocationSheet
            onClose={() => setSheet(null)}
            onSelect={(reference) => {
              setQuery({
                ...query,
                reference,
                page: 0,
                maxDistance: reference ? query.maxDistance : null,
                sort:
                  !reference && query.sort === "nearest"
                    ? "recommended"
                    : query.sort,
              });
              setSheet(null);
            }}
          />
        )}
        <Sheet
          visible={sheet === "future"}
          title="Segera hadir"
          onClose={() => setSheet(null)}
        >
          <Text style={styles.future}>
            Fitur ini tersedia pada tahap berikutnya. Saat ini kamu bisa
            menjelajahi kos, memilih tipe kamar, dan melihat paket sewa.
          </Text>
          <Button title="Kembali menjelajah" onPress={() => setSheet(null)} />
        </Sheet>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, width: "100%", maxWidth: 600, alignSelf: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 13,
    paddingBottom: 20,
  },
  brand: { flexDirection: "row", gap: 8, alignItems: "center" },
  logo: {
    fontSize: 46,
    fontWeight: "800",
    color: colors.primary,
    lineHeight: 47,
  },
  brandName: {
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -1,
    color: colors.primary,
  },
  notification: {
    height: 36,
    width: 36,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    marginHorizontal: 20,
    borderRadius: 9,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: { flex: 1, padding: 14, fontSize: 12, color: colors.ink },
  searchButton: { padding: 13 },
  searchText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  location: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
  },
  pin: { fontSize: 20, color: colors.primary },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    flex: 1,
  },
  chevron: { fontSize: 20, color: colors.muted },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 13,
  },
  tools: { flexDirection: "row", gap: 8, alignItems: "center" },
  tool: {
    width: 31,
    height: 31,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  toolText: { color: "#fff", fontSize: 23, lineHeight: 26 },
  resultLabel: { fontSize: 10, color: colors.muted },
  demo: { fontSize: 8, color: colors.muted, letterSpacing: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 120, gap: 13 },
  row: { gap: 12 },
  pagination: {
    paddingVertical: 18,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  dock: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 20,
    borderRadius: 32,
    backgroundColor: "#fff",
    paddingVertical: 9,
    flexDirection: "row",
    justifyContent: "space-around",
    boxShadow: "0px 4px 14px #00000015",
    borderWidth: 1,
    borderColor: colors.line,
  },
  dockItem: { alignItems: "center", gap: 3, minWidth: 52 },
  dockIcon: {
    width: 35,
    height: 35,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dockActive: { backgroundColor: colors.primary },
  navSymbol: { fontSize: 23, color: colors.primary },
  dockLabel: { fontSize: 9, color: colors.muted },
  future: { fontSize: 14, lineHeight: 22, color: colors.muted },
});
