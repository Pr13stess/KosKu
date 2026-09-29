import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { isAllowedPaymentUrl } from "../../domain/paymentUrl";
import { colors } from "../theme";
/**
 * Xendit's Invoice checkout page. What happens here never confirms a
 * booking: the screen behind it re-reads server state after this closes.
 */
export function PaymentWebView({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Pembayaran (uji coba)</Text>
          <Pressable accessibilityRole="button" hitSlop={12} onPress={onClose}>
            <Text style={styles.done}>Selesai</Text>
          </Pressable>
        </View>
        <WebView
          source={{ uri: url }}
          originWhitelist={["https://*"]}
          onShouldStartLoadWithRequest={(req) => isAllowedPaymentUrl(req.url)}
          javaScriptEnabled
          domStorageEnabled
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.primary },
  done: { fontSize: 14, fontWeight: "700", color: colors.primary },
});
