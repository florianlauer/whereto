import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const signInWithMagicLink = useAuthStore((s) => s.signInWithMagicLink);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signInWithMagicLink(email);
      if (error) {
        toast.error((error as Error).message);
      } else {
        toast.success("Lien magique envoye ! Verifiez votre boite mail.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="magic-email" className="mb-1 block text-sm text-gray-300">
          Email
        </label>
        <input
          id="magic-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          placeholder="votre@email.com"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "..." : "Envoyer le lien magique"}
      </button>
    </form>
  );
}
