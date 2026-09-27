import { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type ImageSourcePropType,
} from "react-native";
import { colors } from "../theme";
const demoImages: Record<string, ImageSourcePropType> = {
  "demo://kos-1": require("../../../assets/kos-1.png"),
  "demo://kos-2": require("../../../assets/kos-2.png"),
  "demo://kos-3": require("../../../assets/kos-3.png"),
};
export function PropertyImage({
  uri,
  style,
}: {
  uri?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false);
  const source = uri ? (demoImages[uri] ?? { uri }) : undefined;
  return (
    <View style={[styles.wrap, style]}>
      {source && !failed ? (
        <Image
          source={source}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
          onError={() => setFailed(true)}
          accessibilityLabel="Foto kos"
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.house}>⌂</Text>
          <Text style={styles.label}>Foto belum tersedia</Text>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.soft, overflow: "hidden" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  house: { fontSize: 42, color: colors.primary },
  label: { fontSize: 11, color: colors.muted },
});
