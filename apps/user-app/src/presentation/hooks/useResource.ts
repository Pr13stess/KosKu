import { useCallback, useEffect, useState } from "react";
export function useResource<T>(loader: () => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    loader: (() => Promise<T>) | null;
    revision: number;
    data: T | null;
    error: string | null;
  }>({ loader: null, revision: -1, data: null, error: null });
  useEffect(() => {
    let active = true;
    loader().then(
      (data) => {
        if (active) setResult({ loader, revision, data, error: null });
      },
      (error: unknown) => {
        if (active)
          setResult({
            loader,
            revision,
            data: null,
            error:
              error instanceof Error ? error.message : "Data gagal dimuat.",
          });
      },
    );
    return () => {
      active = false;
    };
  }, [loader, revision]);
  const loading = result.loader !== loader || result.revision !== revision;
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  return {
    data: loading ? null : result.data,
    loading,
    error: loading ? null : result.error,
    retry,
  };
}
