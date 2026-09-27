import { useCallback, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ScreenProps } from "../../navigation/types";
import { useRepositories } from "../../providers/RepositoryProvider";
import { useResource } from "../hooks/useResource";
import { colors } from "../theme";
import { genderLabel } from "../format";
import { PropertyImage } from "../components/PropertyImage";
import {
  Button,
  FeatureGrid,
  Section,
  Status,
  s,
} from "../components/Primitives";
import { RoomCard } from "../components/RoomCard";
import { Sheet } from "../components/Sheet";
export function PropertyDetailScreen({
  route,
  navigation,
}: ScreenProps<"PropertyDetail">) {
  const { propertyId } = route.params;
  const { properties, rooms } = useRepositories();
  const loader = useCallback(
    async () => ({
      property: await properties.get(propertyId),
      rooms: await rooms.listByProperty(propertyId),
    }),
    [properties, rooms, propertyId],
  );
  const state = useResource(loader);
  const [photo, setPhoto] = useState(0),
    [zoom, setZoom] = useState(false),
    [notice, setNotice] = useState<string | null>(null);
  if (state.loading || state.error)
    return (
      <Status
        loading={state.loading}
        error={state.error}
        onRetry={state.error ? state.retry : undefined}
      />
    );
  const p = state.data?.property;
  if (!p) return <Status empty="Kos tidak tersedia atau sudah diarsipkan" />;
  const roomList = state.data?.rooms ?? [];
  const canChoose = roomList.some((r) => r.available > 0 && r.plans.length > 0);
  const future = () =>
    setNotice(
      "Chat, panggilan, dan catatan akan tersedia pada tahap berikutnya.",
    );
  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Perbesar foto kos"
          onPress={() => setZoom(true)}
        >
          <PropertyImage
            key={photo}
            uri={p.images[photo]}
            style={styles.hero}
          />
          <View style={styles.photoCount}>
            <Text style={styles.photoCountText}>
              {photo + 1} / {Math.max(1, p.images.length)} · Perbesar
            </Text>
          </View>
        </Pressable>
        {p.images.length > 1 && (
          <View style={styles.gallery}>
            {p.images.map((uri, index) => (
              <Pressable
                key={`${uri}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Foto ${index + 1}`}
                onPress={() => setPhoto(index)}
                style={[
                  styles.mini,
                  index === photo && { borderColor: colors.primary },
                ]}
              >
                <PropertyImage uri={uri} style={{ height: 45, width: 68 }} />
              </Pressable>
            ))}
          </View>
        )}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{p.name}</Text>
            <Text style={styles.gender}>{genderLabel(p.gender_type)}</Text>
          </View>
          <Text style={s.muted}>{p.address}</Text>
          <Text style={styles.rating}>
            ★ {p.review_count ? p.rating.toFixed(1) : "Belum ada rating"}{" "}
            <Text style={s.muted}>({p.review_count} ulasan)</Text>
          </Text>
          <Text style={styles.verified}>✓ Kos terverifikasi</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Lihat lokasi di OpenStreetMap"
            onPress={() => {
              if (p.latitude === null || p.longitude === null) {
                setNotice("Koordinat belum tersedia.");
                return;
              }
              void Linking.openURL(
                `https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`,
              ).catch(() => setNotice("Peta tidak dapat dibuka."));
            }}
            style={styles.map}
          >
            <View style={styles.mapRoad} />
            <View style={styles.mapRoad2} />
            <Text style={styles.mapPin}>⌖</Text>
            <Text style={styles.mapLabel}>Lihat lokasi di peta ↗</Text>
            <Text style={styles.mapCredit}>OpenStreetMap · buka peta</Text>
          </Pressable>
          <Text style={styles.description}>{p.description}</Text>
          <Section title="Fasilitas umum">
            <View style={styles.facilityBox}>
              <FeatureGrid items={p.facilities} />
            </View>
          </Section>
          <Section title="Tipe kamar yang tersedia">
            {roomList.map((r) => (
              <RoomCard
                key={r.id}
                room={r}
                onPress={() =>
                  navigation.navigate("RoomSelection", { propertyId })
                }
              />
            ))}
          </Section>
          <Section title="Peraturan kos">
            <Text style={styles.description}>
              {p.rules || "Hubungi pemilik untuk peraturan kos."}
            </Text>
          </Section>
          <View style={styles.owner}>
            <View style={styles.avatar}>
              <Text style={{ color: colors.primary, fontSize: 22 }}>◎</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ownerName}>{p.owner_name}</Text>
              <Text style={s.muted}>Owner terverifikasi · demo akademik</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={styles.actions}>
        {["Chat", "Call", "Catatan"].map((label) => (
          <Pressable
            accessibilityRole="button"
            key={label}
            onPress={future}
            style={styles.smallAction}
          >
            <Text style={styles.actionText}>{label}</Text>
          </Pressable>
        ))}
        <View style={{ flex: 1.5 }}>
          <Button
            title="Pilih kamar"
            disabled={!canChoose}
            onPress={() => navigation.navigate("RoomSelection", { propertyId })}
          />
        </View>
      </View>
      <Modal
        visible={zoom}
        animationType="fade"
        onRequestClose={() => setZoom(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.ink }}>
          <Button title="Tutup foto" onPress={() => setZoom(false)} />
          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          >
            <PropertyImage
              uri={p.images[photo]}
              style={{ height: 350, width: "100%" }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Sheet
        visible={notice !== null}
        title="Informasi"
        onClose={() => setNotice(null)}
      >
        <Text style={styles.description}>{notice}</Text>
        <Button title="Mengerti" onPress={() => setNotice(null)} />
      </Sheet>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  content: { width: "100%", maxWidth: 600, alignSelf: "center" },
  hero: { height: 240 },
  photoCount: {
    position: "absolute",
    bottom: 14,
    right: 14,
    padding: 7,
    borderRadius: 7,
    backgroundColor: "#2A2D45CC",
  },
  photoCountText: { color: "#fff", fontSize: 10 },
  gallery: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  mini: {
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 6,
    overflow: "hidden",
  },
  body: { padding: 20 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  name: { flex: 1, fontSize: 24, fontWeight: "700", color: colors.ink },
  gender: {
    backgroundColor: colors.soft,
    padding: 7,
    borderRadius: 5,
    fontSize: 10,
    color: colors.primary,
  },
  rating: { color: colors.orange, fontSize: 12, marginTop: 9 },
  verified: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "700",
    color: "#865305",
    backgroundColor: colors.orangeSoft,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 5,
    marginTop: 12,
  },
  map: {
    height: 128,
    backgroundColor: "#F1F0E8",
    marginVertical: 20,
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  mapRoad: {
    position: "absolute",
    width: 600,
    height: 20,
    backgroundColor: "#fff",
    transform: [{ rotate: "-18deg" }],
  },
  mapRoad2: {
    position: "absolute",
    width: 600,
    height: 12,
    backgroundColor: "#fff",
    transform: [{ rotate: "63deg" }],
  },
  mapPin: { fontSize: 32, color: colors.primary },
  mapLabel: { fontSize: 12, fontWeight: "700", color: colors.primary },
  mapCredit: {
    position: "absolute",
    bottom: 5,
    right: 7,
    fontSize: 8,
    color: colors.muted,
  },
  description: {
    fontSize: 13,
    lineHeight: 22,
    color: colors.muted,
    marginBottom: 24,
  },
  facilityBox: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 14,
  },
  owner: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  ownerName: { fontSize: 13, fontWeight: "700", color: colors.ink },
  actions: {
    padding: 14,
    gap: 7,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
  },
  smallAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
    borderRadius: 8,
  },
  actionText: { fontSize: 11, color: colors.muted },
});
