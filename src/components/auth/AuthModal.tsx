import { useEffect, useState } from "react";
import { useAuthModalStore } from "@/stores/authModalStore";
import { useAuthStore } from "@/stores/authStore";
import { OAuthButton } from "@/components/auth/OAuthButton";
import { EmailPasswordForm } from "@/components/auth/EmailPasswordForm";
import { MagicLinkForm } from "@/components/auth/MagicLinkForm";

export function AuthModal() {
  const isOpen = useAuthModalStore((s) => s.isOpen);
  const close = useAuthModalStore((s) => s.close);
  const executePending = useAuthModalStore((s) => s.executePending);
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<"email" | "magic">("email");

  // Auto-close on auth success
  useEffect(() => {
    if (user && isOpen) {
      executePending();
    }
  }, [user, isOpen, executePending]);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="mx-4 w-full max-w-md rounded-xl bg-gray-900 p-6">
        <h2 className="mb-6 text-center text-xl font-semibold text-white">Se connecter</h2>

        {/* Google OAuth -- most prominent */}
        <OAuthButton />

        {/* Divider */}
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-700" />
          <span className="text-sm text-gray-400">ou</span>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        {/* Tab toggle */}
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("email")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === "email" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Email / Mot de passe
          </button>
          <button
            type="button"
            onClick={() => setTab("magic")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === "magic" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Lien magique
          </button>
        </div>

        {/* Form content */}
        {tab === "email" ? <EmailPasswordForm /> : <MagicLinkForm />}

        {/* Continue without account (AUTH-06) */}
        <button
          type="button"
          onClick={close}
          className="mt-4 w-full text-center text-sm text-gray-400 underline transition hover:text-gray-300"
        >
          Continuer sans compte
        </button>
      </div>
    </div>
  );
}
