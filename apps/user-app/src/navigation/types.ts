import type { NativeStackScreenProps } from "@react-navigation/native-stack";
export type RootStackParamList = {
  Home: undefined;
  PropertyDetail: { propertyId: string };
  RoomSelection: { propertyId: string };
  PlanSelection: { propertyId: string; roomId: string };
};
export type ScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
