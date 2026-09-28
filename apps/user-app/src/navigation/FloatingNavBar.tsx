import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "./types";
import { colors } from "../presentation/theme";

const ITEMS: Record<keyof MainTabParamList, { icon: string; label: string }> = {
  HomeTab: { icon: "⌂", label: "Home" },
  ChatTab: { icon: "☷", label: "Chat" },
  BookingTab: { icon: "▣", label: "Booking" },
  ProfileTab: { icon: "◎", label: "Profil" },
};

export function FloatingNavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: insets.bottom + 20 }]}
    >
      <View style={styles.dock}>
        {state.routes.map((route, index) => {
          const item = ITEMS[route.name as keyof MainTabParamList];
          if (!item) return null;
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented)
              navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              style={styles.dockItem}
            >
              <View style={[styles.dockIcon, focused && styles.dockActive]}>
                <Text style={[styles.navSymbol, focused && { color: "#fff" }]}>
                  {item.icon}
                </Text>
              </View>
              <Text
                style={[
                  styles.dockLabel,
                  focused && { color: colors.primary, fontWeight: "700" },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
  },
  dock: {
    borderRadius: 32,
    backgroundColor: "#fff",
    paddingVertical: 9,
    flexDirection: "row",
    justifyContent: "space-around",
    boxShadow: "0px 4px 14px #00000015",
    borderWidth: 1,
    borderColor: colors.line,
  },
  dockItem: { alignItems: "center", gap: 3, minWidth: 52 },
  dockIcon: {
    width: 35,
    height: 35,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dockActive: { backgroundColor: colors.primary },
  navSymbol: { fontSize: 23, color: colors.primary },
  dockLabel: { fontSize: 9, color: colors.muted },
});
