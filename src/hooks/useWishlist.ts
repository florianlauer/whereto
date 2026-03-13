import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/appStore";
import type { WishlistItem } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { useTRPCClient, useTRPC } from "@/lib/trpc";

export function useWishlist() {
  const wishlistItems = useAppStore((s) => s.wishlistItems);
  const addLocal = useAppStore((s) => s.addToWishlist);
  const removeLocal = useAppStore((s) => s.removeFromWishlist);
  const setWishlistItems = useAppStore((s) => s.setWishlistItems);

  const user = useAuthStore((s) => s.user);
  const client = useTRPCClient();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const prevUserRef = useRef(user);

  // Fetch server wishlist and replace local if non-empty
  const fetchServerWishlist = useCallback(async () => {
    try {
      const items = await queryClient.fetchQuery(trpc.wishlist.list.queryOptions());
      if (items && items.length > 0) {
        setWishlistItems(items);
      }
    } catch (err) {
      console.error("Failed to fetch server wishlist:", err);
    }
  }, [queryClient, trpc, setWishlistItems]);

  // Merge local items to server on login, then replace local with canonical server state
  const mergeLocalToServer = useCallback(
    async (localItems: WishlistItem[]) => {
      try {
        // Upsert all local items to server in parallel (dedup via onConflict on server)
        await Promise.all(
          localItems.map((item) =>
            client.wishlist.add.mutate({
              poiId: item.poiId,
              countryCode: item.countryCode,
              daysMin: item.daysMin,
            }),
          ),
        );

        // Fetch canonical server state (includes both existing server + newly merged items)
        const serverItems = await queryClient.fetchQuery(trpc.wishlist.list.queryOptions());

        // Replace local state with server data atomically
        // Zustand persist middleware propagates to localStorage automatically
        setWishlistItems(serverItems ?? []);
      } catch (err) {
        // Keep localStorage intact -- will retry on next auth state change
        console.error("Failed to merge wishlist:", err);
      }
    },
    [client, queryClient, trpc, setWishlistItems],
  );

  // Auto-fetch on auth transition (null -> User)
  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    if (!prevUser && user) {
      // Capture local items BEFORE any async work to avoid stale closure
      const localItems = useAppStore.getState().wishlistItems;
      if (localItems.length > 0) {
        mergeLocalToServer(localItems);
      } else {
        fetchServerWishlist();
      }
    }
  }, [user, fetchServerWishlist, mergeLocalToServer]);

  // Auto-fetch on mount with existing session (page refresh)
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    if (user) {
      fetchServerWishlist();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: trpc.wishlist.list.queryOptions().queryKey });
  }, [queryClient, trpc]);

  const addToWishlist = useCallback(
    (item: WishlistItem) => {
      // WISH-04: capture snapshot before optimistic update for rollback on failure
      const snapshot = useAppStore.getState().wishlistItems;
      addLocal(item);
      if (user) {
        client.wishlist.add
          .mutate({ poiId: item.poiId, countryCode: item.countryCode, daysMin: item.daysMin })
          .then(invalidateList)
          .catch((err: unknown) => {
            console.error("Failed to sync add:", err);
            setWishlistItems(snapshot);
          });
      }
    },
    [addLocal, user, client, invalidateList, setWishlistItems],
  );

  const removeFromWishlist = useCallback(
    (poiId: string) => {
      // WISH-04: capture snapshot before optimistic update for rollback on failure
      const snapshot = useAppStore.getState().wishlistItems;
      removeLocal(poiId);
      if (user) {
        client.wishlist.remove
          .mutate({ poiId })
          .then(invalidateList)
          .catch((err: unknown) => {
            console.error("Failed to sync remove:", err);
            setWishlistItems(snapshot);
          });
      }
    },
    [removeLocal, user, client, invalidateList, setWishlistItems],
  );

  return { wishlistItems, addToWishlist, removeFromWishlist };
}
