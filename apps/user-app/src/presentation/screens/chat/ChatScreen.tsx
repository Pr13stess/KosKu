import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ScreenProps } from "../../../navigation/types";
import { useRepositories } from "../../../providers/RepositoryProvider";
import { useAuthSession } from "../../hooks/useAuthSession";
import { useResource } from "../../hooks/useResource";
import { Status } from "../../components/Primitives";
import { colors, radius } from "../../theme";
import { timeLabel } from "../../format";
import { clientMessageId } from "../../clientId";
import type { Message } from "../../../domain/models";
export function ChatScreen({ route, navigation }: ScreenProps<"Chat">) {
  const { conversationId, propertyName } = route.params;
  const { chat } = useRepositories();
  const { session } = useAuthSession();
  const myId = session?.user.id ?? null;
  const loader = useCallback(
    () => chat.listMessages(conversationId),
    [chat, conversationId],
  );
  const state = useResource(loader);
  // Pesan awal datang dari useResource; pesan yang tiba lewat realtime
  // (atau baru saja dikirim sendiri) ditambahkan di sini, lalu keduanya
  // digabung saat render supaya tidak perlu setState di dalam efek.
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const baseIds = useMemo(
    () => new Set((state.data ?? []).map((m) => m.client_message_id)),
    [state.data],
  );
  const messages = useMemo(
    () => [...(state.data ?? []), ...liveMessages],
    [state.data, liveMessages],
  );
  const addLive = useCallback(
    (message: Message) =>
      setLiveMessages((prev) =>
        baseIds.has(message.client_message_id) ||
        prev.some((m) => m.client_message_id === message.client_message_id)
          ? prev
          : [...prev, message],
      ),
    [baseIds],
  );
  useEffect(() => {
    navigation.setOptions({ title: propertyName });
  }, [navigation, propertyName]);
  useEffect(
    () => chat.subscribeMessages(conversationId, addLive),
    [chat, conversationId, addLive],
  );
  const sendText = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const message = await chat.sendText(
        conversationId,
        text,
        clientMessageId(),
      );
      addLive(message);
      setDraft("");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Pesan gagal dikirim.");
    } finally {
      setSending(false);
    }
  };
  const sendImage = async () => {
    if (sending) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSendError("Izin galeri diperlukan untuk mengirim gambar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
    });
    if (result.canceled || !result.assets[0]) return;
    setSending(true);
    setSendError(null);
    try {
      const message = await chat.sendImage(
        conversationId,
        result.assets[0].uri,
        clientMessageId(),
      );
      addLive(message);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Gambar gagal dikirim.");
    } finally {
      setSending(false);
    }
  };
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {state.loading || state.error ? (
          <Status
            loading={state.loading}
            error={state.error}
            onRetry={state.retry}
          />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.client_message_id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Bubble item={item} mine={item.sender_id === myId} />
            )}
          />
        )}
        {sendError && <Text style={styles.error}>{sendError}</Text>}
        <View style={styles.composer}>
          <Pressable
            accessibilityRole="button"
            onPress={sendImage}
            disabled={sending}
            style={styles.attach}
          >
            <Text style={styles.attachIcon}>🖼️</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Tulis pesan…"
            placeholderTextColor={colors.muted}
            multiline
          />
          <Pressable
            accessibilityRole="button"
            onPress={sendText}
            disabled={sending || !draft.trim()}
            style={[
              styles.send,
              (sending || !draft.trim()) && { opacity: 0.5 },
            ]}
          >
            {sending ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <Text style={styles.sendIcon}>➤</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function Bubble({ item, mine }: { item: Message; mine: boolean }) {
  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      <View style={[styles.bubble, mine && styles.bubbleMine]}>
        {item.message_type === "IMAGE" && item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.bubbleImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
            {item.text_content}
          </Text>
        )}
        <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
          {timeLabel(item.created_at)}
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  list: { padding: 16, gap: 8 },
  error: {
    color: colors.danger,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  bubbleRow: { flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "78%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: 10,
    gap: 4,
  },
  bubbleMine: { backgroundColor: colors.primary, borderColor: colors.primary },
  bubbleText: { color: colors.ink, fontSize: 14 },
  bubbleTextMine: { color: colors.surface },
  bubbleTime: { color: colors.muted, fontSize: 10, alignSelf: "flex-end" },
  bubbleTimeMine: { color: colors.selected },
  bubbleImage: {
    width: 200,
    height: 200,
    borderRadius: radius.card - 4,
    backgroundColor: colors.soft,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  attach: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  attachIcon: { fontSize: 20 },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.soft,
    borderRadius: radius.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.ink,
    fontSize: 14,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendIcon: { color: colors.surface, fontSize: 16 },
});
