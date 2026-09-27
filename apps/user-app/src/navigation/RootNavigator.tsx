import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { HomeScreen } from "../presentation/screens/HomeScreen";
import { PropertyDetailScreen } from "../presentation/screens/PropertyDetailScreen";
import { RoomSelectionScreen } from "../presentation/screens/RoomSelectionScreen";
import { PlanSelectionScreen } from "../presentation/screens/PlanSelectionScreen";
import { colors } from "../presentation/theme";
const Stack = createNativeStackNavigator<RootStackParamList>();
export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerTitleStyle: { fontSize: 16, fontWeight: "700" },
          contentStyle: { backgroundColor: "#fff" },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PropertyDetail"
          component={PropertyDetailScreen}
          options={{ title: "Detail kos" }}
        />
        <Stack.Screen
          name="RoomSelection"
          component={RoomSelectionScreen}
          options={{ title: "Pilih tipe kamar" }}
        />
        <Stack.Screen
          name="PlanSelection"
          component={PlanSelectionScreen}
          options={{ title: "Pilih paket sewa" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
