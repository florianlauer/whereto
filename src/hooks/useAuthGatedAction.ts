import { useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useAuthModalStore } from "@/stores/authModalStore";

export function useAuthGatedAction() {
  const user = useAuthStore((s) => s.user);
  const open = useAuthModalStore((s) => s.open);

  return useCallback(
    (action: () => void) => {
      if (user) {
        action();
      } else {
        open(action);
      }
    },
    [user, open],
  );
}
