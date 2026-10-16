import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useAuth() {
  const utils = trpc.useUtils();

  // Track whether the browser currently holds a Supabase session. This lets
  // us avoid showing a stale signed-in UI before Supabase's own async
  // getSession() resolves, and lets us refetch the TaskFlow profile whenever
  // the user signs in or out (see client/src/lib/supabase.ts).
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setHasSession(Boolean(data.session));
      setSessionChecked(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
      setSessionChecked(true);
      // The access token (and therefore the Authorization header main.tsx
      // sends) changed, so the cached TaskFlow profile is stale.
      utils.auth.me.invalidate();
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [utils]);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: sessionChecked,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation();

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      try {
        await logoutMutation.mutateAsync();
      } catch (error: unknown) {
        if (!(error instanceof TRPCClientError)) throw error;
      }
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const loading = !sessionChecked || (hasSession && meQuery.isLoading);

  const state = useMemo(() => ({
    user: meQuery.data ?? null,
    loading,
    error: meQuery.error ?? logoutMutation.error ?? null,
    isAuthenticated: Boolean(meQuery.data),
  }), [meQuery.data, meQuery.error, loading, logoutMutation.error]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
