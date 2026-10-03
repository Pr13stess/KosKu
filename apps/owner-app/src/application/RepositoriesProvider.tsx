import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Linking, Text, View } from "react-native";
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as Crypto from "expo-crypto";
import { AuthRepository } from "../domain/repositories/AuthRepository";
import { ProfileRepository } from "../domain/repositories/ProfileRepository";
import { PropertyRepository } from "../domain/repositories/PropertyRepository";
import { RoomRepository } from "../domain/repositories/RoomRepository";
import { PricingRepository } from "../domain/repositories/PricingRepository";
import { BookingRepository } from "../domain/repositories/BookingRepository";
import { CommunicationRepository } from "../domain/repositories/CommunicationRepository";
import { SupportRepository } from "../domain/repositories/SupportRepository";
import * as Mock from "../data/mock/Repositories";
import * as Live from "../data/supabase/Repositories";
import { MockStore } from "../data/mock/MockStore";
import { Session } from "../domain/models";
export interface Repositories {
  auth: AuthRepository;
  profile: ProfileRepository;
  properties: PropertyRepository;
  rooms: RoomRepository;
  pricing: PricingRepository;
  bookings: BookingRepository;
  communication: CommunicationRepository;
  support: SupportRepository;
  mode: "demo" | "supabase";
  installation: string;
}
const Context = createContext<
  | (Repositories & {
      session: Session | null;
      ready: boolean;
      revision: number;
      refresh: () => void;
      error: string;
    })
  | null
>(null);
async function compose(): Promise<{
  repositories: Repositories;
  dispose: () => void;
}> {
  let installation = await AsyncStorage.getItem("kosku-owner-installation");
  if (!installation) {
    installation = Crypto.randomUUID();
    await AsyncStorage.setItem("kosku-owner-installation", installation);
  }
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (Boolean(url) !== Boolean(key))
    throw new Error(
      "Konfigurasi Supabase belum lengkap. Isi URL dan publishable key, atau kosongkan keduanya untuk demo.",
    );
  if (url && key) {
    const c = createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") c.auth.startAutoRefresh();
      else c.auth.stopAutoRefresh();
    });
    return {
      repositories: {
        mode: "supabase",
        installation,
        auth: new Live.SupabaseAuthRepository(c, installation),
        profile: new Live.SupabaseProfileRepository(c),
        properties: new Live.SupabasePropertyRepository(c),
        rooms: new Live.SupabaseRoomRepository(c),
        pricing: new Live.SupabasePricingRepository(c),
        bookings: new Live.SupabaseBookingRepository(c),
        communication: new Live.SupabaseCommunicationRepository(c),
        support: new Live.SupabaseSupportRepository(c),
      },
      dispose: () => {
        sub.remove();
        c.auth.stopAutoRefresh();
      },
    };
  }
  const s = new MockStore(AsyncStorage);
  return {
    repositories: {
      mode: "demo",
      installation,
      auth: new Mock.MockAuthRepository(),
      profile: new Mock.MockProfileRepository(s),
      properties: new Mock.MockPropertyRepository(s),
      rooms: new Mock.MockRoomRepository(s),
      pricing: new Mock.MockPricingRepository(s),
      bookings: new Mock.MockBookingRepository(s),
      communication: new Mock.MockCommunicationRepository(s),
      support: new Mock.MockSupportRepository(s),
    },
    dispose: () => {},
  };
}
export function RepositoriesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [repos, setRepos] = useState<Repositories | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const cleanup: (() => void)[] = [];
    void compose()
      .then(async ({ repositories: r, dispose }) => {
        if (!active) {
          dispose();
          return;
        }
        cleanup.push(
          dispose,
          r.auth.subscribe((s) => {
            setSession(s);
            setRevision((v) => v + 1);
          }),
        );
        setRepos(r);
        setSession(await r.auth.session());
        setReady(true);
        const initial = await Linking.getInitialURL();
        if (initial) await r.auth.completeRedirect(initial);
        const sub = Linking.addEventListener("url", (e) => {
          void r.auth.completeRedirect(e.url).catch((e) => setError(e.message));
        });
        cleanup.push(() => sub.remove());
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setReady(true);
        }
      });
    return () => {
      active = false;
      cleanup.forEach((fn) => fn());
    };
  }, []);
  if (!repos) return <Initialization error={error} />;
  return (
    <Context.Provider
      value={{
        ...repos,
        session,
        ready,
        error,
        revision,
        refresh: () => setRevision((v) => v + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}

function Initialization({ error }: { error: string }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 30,
        backgroundColor: "#FAF7F1",
      }}
    >
      <Text>{error || "Menyiapkan KosKu Owner…"}</Text>
    </View>
  );
}
export function useRepositories() {
  const value = useContext(Context);
  if (!value) throw new Error("RepositoriesProvider diperlukan.");
  return value;
}
