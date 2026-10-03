import { useNavigation } from "@react-navigation/native";
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { Property, Room, Plan, Conversation } from "../domain/models";
export type Routes = {
  Home: undefined;
  Properties: undefined;
  Property: { id: string };
  PropertyForm: { property?: Property };
  RoomForm: { propertyId: string; room?: Room };
  Inventory: { room: Room };
  Plans: { room: Room };
  PlanForm: { roomId: string; plan?: Plan };
  Bookings: undefined;
  Booking: { id: string };
  Finance: undefined;
  ChatList: undefined;
  Chat: { conversation: Conversation };
  Call: { id: string };
  Restrictions: { conversation: Conversation };
  Profile: undefined;
  Onboarding: undefined;
  EditProfile: undefined;
  Password: undefined;
  Notifications: undefined;
  Reports: undefined;
  Report: { targetType: string; targetId: string };
  Settings: undefined;
  Policy: { kind: "privacy" | "terms" | "help" };
  DeleteAccount: undefined;
};
export type Props<T extends keyof Routes> = NativeStackScreenProps<Routes, T>;
export const useNav = () => useNavigation<NativeStackNavigationProp<Routes>>();
