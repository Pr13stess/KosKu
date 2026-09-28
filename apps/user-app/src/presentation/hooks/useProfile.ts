import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useRepositories } from "../../providers/RepositoryProvider";
import type { Profile } from "../../domain/profile";

export function useProfile() {
  const { profiles } = useRepositories();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await profiles.getMyProfile();
      if (id === requestId.current) setProfile(result);
    } catch (e) {
      if (id === requestId.current)
        setError(e instanceof Error ? e.message : "Gagal memuat profil.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [profiles]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { profile, loading, error, reload, setProfile };
}
