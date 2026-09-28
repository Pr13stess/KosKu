import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { ScreenProps } from "../../../navigation/types";
import { ABOUT_TEXT, FAQ } from "../../content/legal";
import { colors } from "../../theme";

export function InfoScreen({ route }: ScreenProps<"Info">) {
  const about = route.params.kind === "about";
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={s.content}
    >
      {about ? (
        <>
          <Text style={s.title}>Tentang KosKu</Text>
          <Text style={s.body}>{ABOUT_TEXT}</Text>
        </>
      ) : (
        <>
          <Text style={s.title}>Bantuan dan FAQ</Text>
          {FAQ.map((item) => (
            <View key={item.title} style={s.item}>
              <Text style={s.question}>{item.title}</Text>
              <Text style={s.body}>{item.body}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "700", marginBottom: 12 },
  item: { marginTop: 16 },
  question: { color: colors.ink, fontSize: 15, fontWeight: "700", marginBottom: 4 },
  body: { color: colors.ink, fontSize: 14, lineHeight: 21 },
});
