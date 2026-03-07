import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

type AuthActions = {
  initialize: () => Promise<() => void>;
  signUpWithEmail: (email: string, password: string) => Promise<{ data: unknown; error: unknown }>;
  signInWithEmail: (email: string, password: string) => Promise<{ data: unknown; error: unknown }>;
  signInWithMagicLink: (email: string) => Promise<{ error: unknown }>;
  signInWithGoogle: () => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  user: null,
  session: null,
  loading: true,

  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      loading: false,
    });

    // onAuthStateChange callback MUST be synchronous (no async/await)
    // to avoid deadlock pitfall documented in Supabase docs
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
      });
    });

    return () => subscription.unsubscribe();
  },

  signUpWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  },

  signInWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  signInWithMagicLink: async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.href,
      },
    });
    return { error };
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.href,
      },
    });
    return { error };
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
