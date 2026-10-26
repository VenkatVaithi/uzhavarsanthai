import { useEffect, useRef } from "react";
import { useClerk } from "@clerk/react";
import type { QueryClient } from "@tanstack/react-query";

export function ClerkQueryClientCacheInvalidator({ queryClient }: { queryClient: QueryClient }) {
  const { addListener } = useClerk();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}
