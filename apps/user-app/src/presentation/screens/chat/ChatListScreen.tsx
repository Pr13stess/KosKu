import { useCallback } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { TabScreenProps } from "../../../navigation/types";
import { useRepositories } from "../../../providers/RepositoryProvider";
import { useResource } from "../../hooks/useResource";
import { Status } from "../../components/Primitives";
import { colors } from "../../theme";
import { timeLabel } from "../../format";
import type { Conversation } from "../../../domain/models";
export function ChatListScreen({ navigation }: TabScreenProps<"ChatTab">) {
  const { chat } = useRepositories();
  const loader = useCallback(() => chat.listConversations(), [chat]);
  const state = useResource(loader);
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <FlatList
        data={state.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !state.loading ? (
            <Status
              loading={state.loading}
              error={state.error}
              empty="Belum ada percakapan. Mulai chat dari halaman detail kos."
              onRetry={state.retry}
            />
          ) : null
        }
        refreshing={state.loading}
        onRefresh={state.retry}
        renderItem={({ item }) => (
          <ConversationRow
            item={item}
            onPress={() =>
              navigation.navigate("Chat", {
                conversationId: item.id,
                propertyName: item.property_name,
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}
function ConversationRow({
  item,
  onPress,
}: {
  item: Conversation;
  onPress: () => void;
}) {
  const preview = item.last_message
    ? item.last_message.message_type === "IMAGE"
      ? "📷 Gambar"
      : (item.last_message.text_content ?? "")
    : "Belum ada pesan";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.property_name[0] ?? "K"}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.property_name}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      <Text style={styles.time}>{timeLabel(item.updated_at)}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, gap: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.selected,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.primary, fontWeight: "700", fontSize: 16 },
  body: { flex: 1, gap: 2 },
  name: { fontWeight: "700", color: colors.ink, fontSize: 15 },
  preview: { color: colors.muted, fontSize: 13 },
  time: { color: colors.muted, fontSize: 11 },
});
