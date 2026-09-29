import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ScreenProps } from "../../navigation/types";
import { useRepositories } from "../../providers/RepositoryProvider";
import type { Checkout } from "../../domain/models";
import { toCheckoutError } from "../../domain/checkoutErrors";
import { Button, Status } from "../components/Primitives";
import { PaymentWebView } from "../components/PaymentWebView";
import { colors } from "../theme";
import { rupiah } from "../format";
const cancelText: Record<string, string> = {
  HOLD_EXPIRED: "Waktu checkout habis, kamar dilepas kembali.",
  USER_CANCELLED: "Checkout dibatalkan. Tidak ada pembayaran yang diproses.",
  PAYMENT_EXPIRED: "Batas pembayaran berakhir, kamar dilepas kembali.",
  LATE_PAYMENT:
    "Pembayaran masuk setelah waktu habis. Kamar tidak diambil, dan dananya masuk proses pengembalian (simulasi).",
};
const pad = (n: number) => String(n).padStart(2, "0");
export function CheckoutScreen({ route, navigation }: ScreenProps<"Checkout">) {
  const { bookingId, planId } = route.params;
  const { checkout, mode } = useRepositories();
  const [data, setData] = useState<Checkout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  // serverOffsetMs = server clock minus device clock at the moment of the
  // last fetch, so the countdown tracks the server's deadline, not the
  // device's. nowMs only exists to force a re-render every second; the
  // actual value it holds is unused elsewhere.
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const open = data?.status === "HELD" || data?.status === "PENDING_PAYMENT";
  // Fetch on mount and whenever something bumps reloadToken.
  useEffect(() => {
    let active = true;
    checkout.get(bookingId).then(
      (next) => {
        if (!active) return;
        setData(next);
        setError(null);
        setServerOffsetMs(Date.parse(next.serverNow) - Date.now());
        setNowMs(Date.now());
      },
      (e: unknown) => {
        if (active) setError(toCheckoutError(e).message);
      },
    );
    return () => {
      active = false;
    };
  }, [checkout, bookingId, reloadToken]);
  // While a hold is open: tick every second, and re-poll the server every
  // 3 seconds so a payment confirmed elsewhere (e.g. Snap in the browser)
  // shows up here without the user doing anything.
  useEffect(() => {
    if (!open) return;
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    const poll = setInterval(() => setReloadToken((t) => t + 1), 3000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [open]);
  const remaining =
    data?.holdExpiresAt && nowMs !== null
      ? Math.max(0, Math.floor((Date.parse(data.holdExpiresAt) - (nowMs + serverOffsetMs)) / 1000))
      : null;
  // Countdown hit zero client-side: ask the server for the authoritative
  // outcome instead of assuming HOLD_EXPIRED ourselves.
  useEffect(() => {
    if (!open || remaining !== 0) return;
    const id = setTimeout(() => setReloadToken((t) => t + 1), 0);
    return () => clearTimeout(id);
  }, [open, remaining]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      setReloadToken((t) => t + 1);
    } catch (e) {
      setError(toCheckoutError(e).message);
    } finally {
      setBusy(false);
    }
  }
  const confirmCancel = () =>
    Alert.alert("Batalkan checkout?", "Kamar yang ditahan akan dilepas.", [
      { text: "Lanjutkan bayar", style: "cancel" },
      {
        text: "Batalkan",
        style: "destructive",
        onPress: () => void run(() => checkout.cancel(bookingId)),
      },
    ]);
  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>DEMO / TEST MODE PAYMENT (XENDIT) · tanpa uang nyata</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {!data ? (
          <Status
            loading={!error}
            error={error}
            onRetry={error ? () => setReloadToken((t) => t + 1) : undefined}
          />
        ) : (
          <>
            <Text style={styles.title}>{data.propertyName}</Text>
            <Text style={styles.meta}>
              {data.roomTypeName} · {data.planName} · {data.bookingCode}
            </Text>
            {open && remaining !== null && (
              <View style={styles.timer}>
                <Text style={styles.meta}>Kamar ditahan untukmu</Text>
                <Text style={styles.time}>
                  {pad(Math.floor(remaining / 60))}:{pad(remaining % 60)}
                </Text>
              </View>
            )}
            <View style={styles.cost}>
              {[
                ["Harga sewa", data.rent],
                ["DP booking (bagian dari sewa)", data.downPayment],
                ["Security deposit", data.securityDeposit],
                ["Sisa sewa saat masuk", data.remainingRent],
              ].map(([label, value]) => (
                <View key={String(label)} style={styles.row}>
                  <Text style={styles.meta}>{label}</Text>
                  <Text style={styles.value}>{rupiah(Number(value))}</Text>
                </View>
              ))}
              <View style={styles.row}>
                <Text style={styles.title}>Bayar sekarang</Text>
                <Text style={styles.title}>{rupiah(data.payNow)}</Text>
              </View>
            </View>
            {data.status === "CONFIRMED" && (
              <Text style={styles.ok}>
                Pembayaran diterima dan booking terkonfirmasi. Unit sudah dialokasikan untukmu.
              </Text>
            )}
            {data.status === "CANCELLED" && (
              <Text style={styles.warn}>
                {cancelText[data.cancelReason ?? ""] ?? "Booking dibatalkan."}
              </Text>
            )}
            {open && data.paymentStatus === "PENDING" && (
              <Text style={styles.meta}>
                Menutup layar pembayaran tidak membatalkan checkout. Status diperbarui otomatis dari server.
              </Text>
            )}
            {error && <Text style={styles.warn}>{error}</Text>}
          </>
        )}
      </ScrollView>
      {data && (
        <View style={styles.footer}>
          {open && (
            <>
              {mode === "mock" ? (
                <Button
                  title="Simulasikan pembayaran berhasil"
                  disabled={busy}
                  onPress={() => void run(async () => checkout.simulatePayment?.(bookingId))}
                />
              ) : data.redirectUrl ? (
                <Button title="Bayar sekarang" disabled={busy} onPress={() => setPaying(true)} />
              ) : (
                <Button
                  title="Muat sesi pembayaran"
                  disabled={busy}
                  onPress={() => void run(async () => void (await checkout.start(planId)))}
                />
              )}
              <Button secondary title="Batalkan checkout" disabled={busy} onPress={confirmCancel} />
            </>
          )}
          {!open && <Button title="Kembali ke beranda" onPress={() => navigation.popToTop()} />}
        </View>
      )}
      {paying && data?.redirectUrl && (
        <PaymentWebView
          url={data.redirectUrl}
          onClose={() => {
            setPaying(false);
            setReloadToken((t) => t + 1);
          }}
        />
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  banner: { backgroundColor: colors.ink, paddingVertical: 8 },
  bannerText: { color: "#fff", fontSize: 11, fontWeight: "700", textAlign: "center" },
  content: { padding: 20, gap: 14, maxWidth: 600, width: "100%", alignSelf: "center" },
  title: { fontSize: 14, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 11, color: colors.muted, lineHeight: 17 },
  timer: { alignItems: "center", padding: 14, borderRadius: 12, backgroundColor: colors.soft, gap: 4 },
  time: { fontSize: 30, fontWeight: "800", color: colors.primary },
  cost: { gap: 12, padding: 16, borderRadius: 12, backgroundColor: colors.background },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  value: { fontSize: 11, fontWeight: "600", color: colors.primary },
  ok: { fontSize: 12, color: colors.green, lineHeight: 18 },
  warn: { fontSize: 12, color: colors.danger, lineHeight: 18 },
  footer: { padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: colors.line },
});
