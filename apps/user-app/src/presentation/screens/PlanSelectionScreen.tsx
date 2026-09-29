import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ScreenProps } from "../../navigation/types";
import { useRepositories } from "../../providers/RepositoryProvider";
import { summarizeCost } from "../../domain/pricing";
import { toCheckoutError } from "../../domain/checkoutErrors";
import { useResource } from "../hooks/useResource";
import { Button, Status } from "../components/Primitives";
import { colors } from "../theme";
import { periodLabel, rupiah } from "../format";
export function PlanSelectionScreen({
  route,
  navigation,
}: ScreenProps<"PlanSelection">) {
  const { propertyId, roomId } = route.params;
  const { pricing, rooms, checkout } = useRepositories();
  const [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const loader = useCallback(
    async () => ({
      plans: await pricing.listByRoom(roomId),
      room: (await rooms.listByProperty(propertyId)).find(
        (r) => r.id === roomId,
      ),
    }),
    [pricing, rooms, propertyId, roomId],
  );
  const state = useResource(loader);
  const room = state.data?.room;
  const plan = state.data?.plans.find((p) => p.id === selected);
  const cost = plan ? summarizeCost(plan) : null;
  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {state.loading || state.error ? (
            <Status
              loading={state.loading}
              error={state.error}
              onRetry={state.error ? state.retry : undefined}
            />
          ) : !room ? (
            <Status empty="Tipe kamar tidak tersedia" />
          ) : (
            <>
              <View style={styles.room}>
                <Text style={styles.roomName}>{room.name}</Text>
                <Text style={styles.meta}>
                  {room.room_size_m2} m² · {room.available} unit tersedia
                </Text>
              </View>
              <Text style={styles.hint}>Pilih durasi tinggalmu</Text>
              {state.data?.plans.length ? (
                state.data.plans.map((p) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: p.id === selected,
                      disabled: room.available === 0,
                    }}
                    accessibilityLabel={`Paket ${p.name}`}
                    disabled={room.available === 0}
                    onPress={() => setSelected(p.id)}
                    style={[styles.plan, p.id === selected && styles.selected]}
                  >
                    <View style={{ flex: 1, gap: 5 }}>
                      <Text style={styles.roomName}>{p.name}</Text>
                      <Text style={styles.meta}>
                        {rupiah(p.price)} /{" "}
                        {periodLabel(p.duration_unit, p.duration_value)}
                      </Text>
                      <Text style={styles.meta}>
                        DP {rupiah(p.down_payment)} · Deposit{" "}
                        {rupiah(p.security_deposit)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radio,
                        p.id === selected && styles.radioSelected,
                      ]}
                    />
                  </Pressable>
                ))
              ) : (
                <Status empty="Belum ada paket sewa aktif" />
              )}
              {room.available === 0 && (
                <Text style={styles.hint}>
                  Kamar sudah penuh. Silakan pilih tipe lain.
                </Text>
              )}
              {plan && cost && (
                <View style={styles.cost}>
                  <Text style={styles.roomName}>Rincian biaya</Text>
                  {[
                    ["Harga sewa", cost.rent],
                    ["DP booking (bagian dari sewa)", cost.downPayment],
                    ["Security deposit", cost.deposit],
                    ["Bayar saat booking", cost.payNow],
                    ["Sisa sewa saat masuk", cost.remainingRent],
                    ["Total sewa + deposit", cost.total],
                  ].map(([label, value]) => (
                    <View key={String(label)} style={styles.costRow}>
                      <Text style={styles.meta}>{label}</Text>
                      <Text style={styles.costValue}>
                        {rupiah(Number(value))}
                      </Text>
                    </View>
                  ))}
                  <Text style={styles.terms}>{plan.deposit_terms}</Text>
                  <Text style={styles.terms}>
                    Deposit{" "}
                    {plan.deposit_refundable
                      ? "dapat dikembalikan sesuai ketentuan"
                      : "tidak dapat dikembalikan"}
                    . Pembatalan sebelum masuk: pengembalian penuh atas jumlah
                    yang dibayar saat booking pada simulasi demo.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
        <View style={styles.footer}>
          {cost && cost.payNow <= 0 && (
            <Text style={styles.preview}>
              Paket ini tidak punya DP atau deposit, jadi belum bisa
              dibayar lewat checkout.
            </Text>
          )}
          {error && (
            <Text style={[styles.preview, { color: colors.danger }]}>
              {error}
            </Text>
          )}
          <Button
            title={busy ? "Menahan kamar…" : "Lanjut ke checkout"}
            disabled={
              !plan || !room || room.available < 1 || busy || !cost || cost.payNow <= 0
            }
            onPress={async () => {
              if (!plan) return;
              setBusy(true);
              setError(null);
              try {
                const { bookingId } = await checkout.start(plan.id);
                navigation.navigate("Checkout", { bookingId, planId: plan.id });
              } catch (e) {
                setError(toCheckoutError(e).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, maxWidth: 600, width: "100%", alignSelf: "center" },
  content: { padding: 20 },
  room: {
    backgroundColor: colors.soft,
    padding: 16,
    borderRadius: 10,
    gap: 5,
    marginBottom: 24,
  },
  roomName: { fontSize: 14, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 11, color: colors.muted, lineHeight: 17 },
  hint: { fontSize: 12, color: colors.muted, marginBottom: 14 },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 9,
    marginBottom: 12,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
    borderWidth: 2,
    padding: 15,
  },
  radio: {
    width: 17,
    height: 17,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#AAA",
  },
  radioSelected: { borderWidth: 5, borderColor: colors.primary },
  cost: {
    marginTop: 15,
    gap: 14,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  costRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  costValue: { fontSize: 11, color: colors.primary, fontWeight: "600" },
  terms: { fontSize: 11, lineHeight: 18, color: colors.muted },
  footer: {
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  preview: { fontSize: 10, color: colors.muted, textAlign: "center" },
});
