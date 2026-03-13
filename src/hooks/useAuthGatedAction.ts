import { useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useAuthModalStore } from "@/stores/authModalStore";

const SESSION_KEY = "auth_prompt_shown";
const PROMPT_THRESHOLD = 3;

export function useAuthGatedAction() {
  const user = useAuthStore((s) => s.user);
  const open = useAuthModalStore((s) => s.open);

  return useCallback(
    (action: () => void) => {
      // Always execute the action (localStorage works for anonymous users)
      action();

      // If authenticated or already prompted this session, nothing more to do
      if (user) return;
      if (sessionStorage.getItem(SESSION_KEY)) return;

      // Count anonymous adds and prompt at threshold
      const count = Number(sessionStorage.getItem("auth_prompt_count") ?? "0") + 1;
      sessionStorage.setItem("auth_prompt_count", String(count));

      if (count >= PROMPT_THRESHOLD) {
        sessionStorage.setItem(SESSION_KEY, "1");
        open();
      }
    },
    [user, open],
  );
}
