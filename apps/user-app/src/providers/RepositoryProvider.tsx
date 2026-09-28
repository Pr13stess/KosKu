import "react-native-url-polyfill/auto";
import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PropertyRepository } from "../domain/repositories/PropertyRepository";
import type { RoomRepository } from "../domain/repositories/RoomRepository";
import type { PricingRepository } from "../domain/repositories/PricingRepository";
import type { AuthRepository } from "../domain/repositories/AuthRepository";
import { MockPropertyRepository } from "../data/mock/MockPropertyRepository";
import { MockRoomRepository } from "../data/mock/MockRoomRepository";
import { MockPricingRepository } from "../data/mock/MockPricingRepository";
import { MockAuthRepository } from "../data/mock/MockAuthRepository";
import { SupabasePropertyRepository } from "../data/supabase/SupabasePropertyRepository";
import { SupabaseRoomRepository } from "../data/supabase/SupabaseRoomRepository";
import { SupabasePricingRepository } from "../data/supabase/SupabasePricingRepository";
import { SupabaseAuthRepository } from "../data/supabase/SupabaseAuthRepository";
export interface Repositories {
  properties: PropertyRepository;
  rooms: RoomRepository;
  pricing: PricingRepository;
  auth: AuthRepository;
  mode: "mock" | "supabase";
}
const Context = createContext<Repositories | null>(null);
function compose(): Repositories {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url && key) {
    const client = createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    return {
      properties: new SupabasePropertyRepository(client),
      rooms: new SupabaseRoomRepository(client),
      pricing: new SupabasePricingRepository(client),
      auth: new SupabaseAuthRepository(client),
      mode: "supabase",
    };
  }
  return {
    properties: new MockPropertyRepository(),
    rooms: new MockRoomRepository(),
    pricing: new MockPricingRepository(),
    auth: new MockAuthRepository(),
    mode: "mock",
  };
}
export function RepositoryProvider({
  children,
  repositories,
}: PropsWithChildren<{ repositories?: Repositories }>) {
  const [value] = useState(() => repositories ?? compose());
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useRepositories(): Repositories {
  const value = useContext(Context);
  if (!value) throw new Error("RepositoryProvider wajib tersedia.");
  return value;
}
