import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

type Mode = "sign-in" | "sign-up";

export function EmailPasswordForm() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "sign-up") {
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          toast.error((error as Error).message);
        } else {
          toast.success("Compte cree !");
        }
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          toast.error((error as Error).message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="auth-email" className="mb-1 block text-sm text-gray-300">
          Email
        </label>
        <input
          id="auth-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          placeholder="votre@email.com"
        />
      </div>
      <div>
        <label htmlFor="auth-password" className="mb-1 block text-sm text-gray-300">
          Mot de passe
        </label>
        <input
          id="auth-password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          placeholder="6 caracteres minimum"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "..." : mode === "sign-in" ? "Se connecter" : "Creer un compte"}
      </button>
      <p className="text-center text-sm text-gray-400">
        {mode === "sign-in" ? (
          <>
            Pas encore de compte ?{" "}
            <button
              type="button"
              onClick={() => setMode("sign-up")}
              className="text-blue-400 underline hover:text-blue-300"
            >
              Creer un compte
            </button>
          </>
        ) : (
          <>
            Deja un compte ?{" "}
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              className="text-blue-400 underline hover:text-blue-300"
            >
              Se connecter
            </button>
          </>
        )}
      </p>
    </form>
  );
}
