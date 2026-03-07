import { useAuthStore } from "@/stores/authStore";
import { useAuthModalStore } from "@/stores/authModalStore";

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const openModal = useAuthModalStore((s) => s.open);

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openModal()}
        className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white"
      >
        Se connecter
      </button>
    );
  }

  const displayEmail =
    user.email && user.email.length > 20 ? `${user.email.slice(0, 17)}...` : user.email;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-300" title={user.email}>
        {displayEmail}
      </span>
      <button
        type="button"
        onClick={signOut}
        className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 transition hover:border-red-500 hover:text-red-400"
      >
        Deconnexion
      </button>
    </div>
  );
}
