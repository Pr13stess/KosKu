import { useEffect, useState } from "react";
import { useRepositories } from "../application/RepositoriesProvider";
export function useLoad<T>(loader: () => Promise<T>, poll = 0) {
  const { revision } = useRepositories();
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    data?: T;
    error: string;
    loader: typeof loader;
    revision: number;
    retry: number;
  }>();
  useEffect(() => {
    let active = true;
    const load = () =>
      void loader()
        .then((data) => {
          if (active) setResult({ data, error: "", loader, revision, retry });
        })
        .catch((e) => {
          if (active)
            setResult({
              error: e instanceof Error ? e.message : String(e),
              loader,
              revision,
              retry,
            });
        });
    load();
    const timer = poll ? setInterval(load, poll) : undefined;
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [loader, poll, revision, retry]);
  const current =
    result?.loader === loader &&
    result.revision === revision &&
    result.retry === retry;
  return {
    data: current ? result?.data : undefined,
    error: current ? (result?.error ?? "") : "",
    loading: !current,
    retry: () => setRetry((v) => v + 1),
  };
}
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { refresh } = useRepositories();
  return {
    busy,
    error,
    message,
    run: async (
      fn: () => Promise<unknown>,
      success?: () => void,
      text = "Perubahan tersimpan.",
    ) => {
      if (busy) return;
      setBusy(true);
      setError("");
      setMessage("");
      try {
        await fn();
        refresh();
        setMessage(text);
        success?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
  };
}
