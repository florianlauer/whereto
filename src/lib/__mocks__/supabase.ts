import { vi } from "vitest";

export const supabase = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOtp: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })),
  },
};
