import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { useAuthSession } from "../presentation/hooks/useAuthSession";
import { LoginScreen } from "../presentation/screens/LoginScreen";
import { RegisterScreen } from "../presentation/screens/RegisterScreen";
import { HomeScreen } from "../presentation/screens/HomeScreen";
import { PropertyDetailScreen } from "../presentation/screens/PropertyDetailScreen";
import { RoomSelectionScreen } from "../presentation/screens/RoomSelectionScreen";
import { PlanSelectionScreen } from "../presentation/screens/PlanSelectionScreen";
import { colors } from "../presentation/theme";
const Stack = createNativeStackNavigator<RootStackParamList>();
function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
export function RootNavigator() {
  const { loading, session } = useAuthSession();
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
        {loading ? (
          <Stack.Screen
            name="Login"
            options={{ headerShown: false }}
            component={LoadingScreen}
          />
        ) : !session ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
