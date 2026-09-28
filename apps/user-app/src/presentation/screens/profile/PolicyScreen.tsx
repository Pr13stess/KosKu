import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { ScreenProps } from "../../../navigation/types";
import { ACADEMIC_NOTICE, LEGAL, POLICY_VERSION } from "../../content/legal";
import { colors, radius } from "../../theme";

export function PolicyScreen({ route }: ScreenProps<"Policy">) {
  const doc = LEGAL[route.params.kind];
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={s.content}
    >
      <View style={s.notice}>
        <Text style={s.noticeText}>{ACADEMIC_NOTICE}</Text>
      </View>
      <Text style={s.title}>{doc.title}</Text>
      <Text style={s.version}>Versi {POLICY_VERSION}</Text>
      {doc.sections.map((sec) => (
        <View key={sec.title} style={s.section}>
          <Text style={s.sectionTitle}>{sec.title}</Text>
          <Text style={s.body}>{sec.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  notice: {
    backgroundColor: colors.orangeSoft,
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 20,
  },
  noticeText: { color: colors.ink, fontSize: 13, lineHeight: 19 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "700" },
  version: { color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: 8 },
  section: { marginTop: 18 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: "700", marginBottom: 6 },
  body: { color: colors.ink, fontSize: 14, lineHeight: 21 },
});
