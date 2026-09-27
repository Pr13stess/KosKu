import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ScreenProps } from "../../navigation/types";
import { useRepositories } from "../../providers/RepositoryProvider";
import { useResource } from "../hooks/useResource";
import { Button, Status } from "../components/Primitives";
import { RoomCard } from "../components/RoomCard";
import { colors } from "../theme";
export function RoomSelectionScreen({
  route,
  navigation,
}: ScreenProps<"RoomSelection">) {
  const { propertyId } = route.params;
  const { rooms } = useRepositories();
  const [selected, setSelected] = useState<string | null>(null);
  const loader = useCallback(
    () => rooms.listByProperty(propertyId),
    [rooms, propertyId],
  );
  const state = useResource(loader);
  const room = state.data?.find(
    (r) => r.id === selected && r.available > 0 && r.plans.length > 0,
  );
  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.hint}>Pilih ruang yang paling pas untukmu.</Text>
          {state.loading || state.error ? (
            <Status
              loading={state.loading}
              error={state.error}
              onRetry={state.error ? state.retry : undefined}
            />
          ) : state.data?.length ? (
            state.data.map((r) => (
              <RoomCard
                key={r.id}
                room={r}
                selected={r.id === selected}
                compact
                onPress={() => setSelected(r.id)}
              />
            ))
          ) : (
            <Status empty="Belum ada tipe kamar" />
          )}
        </ScrollView>
        <View style={styles.footer}>
          <Text style={styles.notice}>
            Ketersediaan dapat berubah hingga proses checkout.
          </Text>
          <Button
            title="Lanjut pilih paket sewa"
            disabled={!room}
            onPress={() => {
              if (room)
                navigation.navigate("PlanSelection", {
                  propertyId,
                  roomId: room.id,
                });
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, width: "100%", maxWidth: 600, alignSelf: "center" },
  content: { padding: 20 },
  hint: { fontSize: 12, color: colors.muted, marginBottom: 20 },
  footer: {
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  notice: { fontSize: 10, color: colors.muted, textAlign: "center" },
});
