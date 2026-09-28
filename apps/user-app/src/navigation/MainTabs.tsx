import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "./types";
import { FloatingNavBar } from "./FloatingNavBar";
import { HomeScreen } from "../presentation/screens/HomeScreen";
import { ProfileScreen } from "../presentation/screens/profile/ProfileScreen";
import { PlaceholderScreen } from "../presentation/screens/profile/PlaceholderScreen";
import { colors } from "../presentation/theme";

const Tab = createBottomTabNavigator<MainTabParamList>();

const ChatPlaceholder = () => (
  <PlaceholderScreen
    title="Chat belum tersedia"
    description="Percakapan dengan pemilik kos akan muncul di sini."
  />
);
const BookingPlaceholder = () => (
  <PlaceholderScreen
    title="Belum ada booking"
    description="Booking kamu akan muncul di sini setelah fitur pemesanan tersedia."
  />
);

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingNavBar {...props} />}
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 16, fontWeight: "700" },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: "Home", headerShown: false }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatPlaceholder}
        options={{ title: "Chat" }}
      />
      <Tab.Screen
        name="BookingTab"
        component={BookingPlaceholder}
        options={{ title: "Booking Saya" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: "Profil" }}
      />
    </Tab.Navigator>
  );
}
