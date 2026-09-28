import { StyleSheet, Text, View } from "react-native";
import type { ScreenProps } from "../../../navigation/types";
import { colors } from "../../theme";

export function PlaceholderScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={s.wrap}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.body}>{description}</Text>
    </View>
  );
}

export function ComingSoonScreen({ route }: ScreenProps<"ComingSoon">) {
  return (
    <PlaceholderScreen
      title={route.params.title}
      description={route.params.description}
    />
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: colors.background,
  },
  title: { color: colors.ink, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  body: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
