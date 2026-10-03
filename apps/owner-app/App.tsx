import React, { useCallback, useEffect, useState } from "react";
import { Platform, View } from "react-native";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  RepositoriesProvider,
  useRepositories,
} from "./src/application/RepositoriesProvider";
import { Routes } from "./src/presentation/navigation";
import {
  HomeScreen,
  PropertiesScreen,
  PropertyScreen,
} from "./src/presentation/screens/PropertyScreens";
import { PropertyFormScreen } from "./src/presentation/screens/PropertyFormScreen";
import {
  InventoryScreen,
  PlanFormScreen,
  PlansScreen,
  RoomFormScreen,
} from "./src/presentation/screens/RoomScreens";
import {
  BookingScreen,
  BookingsScreen,
  FinanceScreen,
} from "./src/presentation/screens/BookingScreens";
import {
  ChatListScreen,
  ChatScreen,
  RestrictionsScreen,
} from "./src/presentation/screens/ChatScreens";
import { CallScreen } from "./src/presentation/screens/CallScreen";
import {
  AuthScreen,
  DeleteAccountScreen,
  EditProfileScreen,
  OnboardingScreen,
  PasswordScreen,
  PolicyScreen,
  ProfileScreen,
} from "./src/presentation/screens/AccountScreens";
import {
  NotificationsScreen,
  ReportScreen,
  ReportsScreen,
  SettingsScreen,
} from "./src/presentation/screens/SupportScreens";
import {
  Button,
  C,
  Card,
  Feedback,
  Load,
  T,
} from "./src/presentation/components/UI";

const Stack = createNativeStackNavigator<Routes>();
const navigationRef = createNavigationContainerRef<Routes>();
function SignedIn() {
  const { communication, profile, session, mode } = useRepositories();
  const [boot, setBoot] = useState({ loading: true, error: "" });
  const initialize = useCallback(() => {
    void profile
      .get()
      .then(() => setBoot({ loading: false, error: "" }))
      .catch((e) => setBoot({ loading: false, error: e.message }));
  }, [profile]);
  useEffect(() => {
    initialize();
  }, [initialize]);
  const [incoming, setIncoming] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const check = () =>
      void communication
        .calls()
        .then((calls) => {
          if (active)
            setIncoming(
              calls.find(
                (c) => c.status === "RINGING" && c.receiver_id === session?.id,
              )?.id ?? null,
            );
        })
        .catch(() => {});
    const unsub = communication.watch(check);
    const timer = setInterval(check, 8000);
    check();
    return () => {
      active = false;
      unsub();
      clearInterval(timer);
    };
  }, [communication, session?.id]);
  useEffect(() => {
    if (Platform.OS === "web" || mode === "demo") return;
    let remove: (() => void) | undefined;
    let active = true;
    void import("expo-notifications")
      .then((N) => {
        if (!active) return;
        const sub = N.addNotificationResponseReceivedListener(() => {
          if (navigationRef.isReady()) navigationRef.navigate("Notifications");
        });
        remove = () => sub.remove();
      })
      .catch(() => {});
    return () => {
      active = false;
      remove?.();
    };
  }, [mode]);
  if (boot.loading || boot.error)
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Load {...boot} retry={initialize} />
      </View>
    );
  return (
    <NavigationContainer
      ref={navigationRef}
      linking={{
        prefixes: ["kosku-owner://"],
        config: { screens: { Password: "reset" } },
      }}
    >
      <View style={{ flex: 1 }}>
        {incoming && (
          <Card
            style={{
              borderRadius: 0,
              backgroundColor: "#FFF0DA",
              paddingTop: 30,
            }}
          >
            <T>Panggilan masuk</T>
            <Button
              title="Lihat panggilan"
              onPress={() => navigationRef.navigate("Call", { id: incoming })}
            />
          </Card>
        )}
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: C.cream },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Properties" component={PropertiesScreen} />
          <Stack.Screen name="Property" component={PropertyScreen} />
          <Stack.Screen name="PropertyForm" component={PropertyFormScreen} />
          <Stack.Screen name="RoomForm" component={RoomFormScreen} />
          <Stack.Screen name="Inventory" component={InventoryScreen} />
          <Stack.Screen name="Plans" component={PlansScreen} />
          <Stack.Screen name="PlanForm" component={PlanFormScreen} />
          <Stack.Screen name="Bookings" component={BookingsScreen} />
          <Stack.Screen name="Booking" component={BookingScreen} />
          <Stack.Screen name="Finance" component={FinanceScreen} />
          <Stack.Screen name="ChatList" component={ChatListScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Call" component={CallScreen} />
          <Stack.Screen name="Restrictions" component={RestrictionsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="Password" component={PasswordScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="Report" component={ReportScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Policy" component={PolicyScreen} />
          <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
        </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
}
function Root() {
  const { session, ready, error } = useRepositories();
  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        maxWidth: 500,
        alignSelf: "center",
        backgroundColor: C.cream,
      }}
    >
      <Feedback text={error} error />
      {!ready ? <T>Memuat…</T> : session ? <SignedIn /> : <AuthScreen />}
    </View>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1, backgroundColor: "#E9E7E2" }}>
        <RepositoriesProvider>
          <Root />
        </RepositoriesProvider>
      </View>
    </SafeAreaProvider>
  );
}
