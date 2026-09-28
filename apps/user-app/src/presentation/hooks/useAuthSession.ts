import { useEffect, useState } from "react";
import { useRepositories } from "../../providers/RepositoryProvider";
import type { Session } from "../../domain/models";
/**
 * Resolves once (getSession) then stays live via onChange, so the
 * navigator can gate the app behind a session without polling.
 */
export function useAuthSession() {
  const { auth } = useRepositories();
  const [state, setState] = useState<{
    loading: boolean;
    session: Session | null;
  }>({ loading: true, session: null });
  useEffect(() => {
    let active = true;
    auth.getSession().then((session) => {
      if (active) setState({ loading: false, session });
    });
    const unsubscribe = auth.onChange((session) => {
      if (active) setState({ loading: false, session });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth]);
  return state;
}
