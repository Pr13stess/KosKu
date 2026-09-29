import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from "@react-navigation/native";

export type MainTabParamList = {
  HomeTab: undefined;
  ChatTab: undefined;
  BookingTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  PropertyDetail: { propertyId: string };
  RoomSelection: { propertyId: string };
  PlanSelection: { propertyId: string; roomId: string };
  Chat: { conversationId: string; propertyName: string };
  EditProfile: undefined;
  ChangePassword: undefined;
  Policy: { kind: "privacy" | "terms" };
  Info: { kind: "help" | "about" };
  ComingSoon: { title: string; description: string };
};

export type ScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;
