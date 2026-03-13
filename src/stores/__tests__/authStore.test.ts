import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User, Session } from "@supabase/supabase-js";

vi.mock("@/lib/supabase");

import { supabase } from "@/lib/supabase";

const mockUser: User = {
  id: "user-123",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
  identities: [],
};

const mockSession: Session = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: mockUser,
};

describe("authStore", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset the store between tests
    const { useAuthStore } = await import("@/stores/authStore");
    useAuthStore.setState({ user: null, session: null, loading: true });
  });

  it("email signup: signUp called with email+password, store updates user on success", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const result = await useAuthStore.getState().signUpWithEmail("test@example.com", "password123");

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.data).toBeDefined();
    expect(result.error).toBeNull();
  });

  it("email signin: signInWithPassword called correctly", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const result = await useAuthStore.getState().signInWithEmail("test@example.com", "password123");

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.data).toBeDefined();
    expect(result.error).toBeNull();
  });

  it("magic link: signInWithOtp called with email and emailRedirectTo containing current URL", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
      data: { user: null, session: null, messageId: null },
      error: null,
    });

    await useAuthStore.getState().signInWithMagicLink("test@example.com");

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "test@example.com",
      options: {
        emailRedirectTo: expect.stringContaining(window.location.href),
      },
    });
  });

  it("google oauth: signInWithOAuth called with provider google and redirectTo containing current URL", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: "google", url: "https://accounts.google.com/..." },
      error: null,
    });

    await useAuthStore.getState().signInWithGoogle();

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: expect.stringContaining(window.location.href),
      },
    });
  });

  it("session persistence: getSession returns cached session, store initializes with it", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as never);

    await useAuthStore.getState().initialize();

    expect(supabase.auth.getSession).toHaveBeenCalled();
    expect(useAuthStore.getState().session).toEqual(mockSession);
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it("redirect preserves URL: redirectTo option includes window.location.href", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    // Set a specific location for the test
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost:3000/explore?budget=1000" },
      writable: true,
    });

    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
      data: { user: null, session: null, messageId: null },
      error: null,
    });
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: "google", url: "https://accounts.google.com/..." },
      error: null,
    });

    await useAuthStore.getState().signInWithMagicLink("test@example.com");
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { emailRedirectTo: "http://localhost:3000/explore?budget=1000" },
      }),
    );

    await useAuthStore.getState().signInWithGoogle();
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { redirectTo: "http://localhost:3000/explore?budget=1000" },
      }),
    );
  });

  it("signout: signOut clears user and session to null", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    // Pre-set some state
    useAuthStore.setState({ user: mockUser, session: mockSession, loading: false });

    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    // Simulate onAuthStateChange callback firing on signout
    let authChangeCallback: (event: string, session: null) => void = () => {};
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
      authChangeCallback = cb as never;
      return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
    });

    // Initialize to register the listener
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    await useAuthStore.getState().initialize();

    await useAuthStore.getState().signOut();

    expect(supabase.auth.signOut).toHaveBeenCalled();

    // Simulate the auth state change event that Supabase fires on signout
    authChangeCallback("SIGNED_OUT", null);

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().session).toBeNull();
  });

  it("onAuthStateChange is sync: callback only calls set(), no async/await", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    let capturedCallback: (...args: unknown[]) => unknown = () => {};

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
      capturedCallback = cb as never;
      return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
    });
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await useAuthStore.getState().initialize();

    // Call the captured callback -- it should be synchronous (not return a Promise)
    const result = capturedCallback("SIGNED_IN", mockSession);
    expect(result).not.toBeInstanceOf(Promise);

    // Verify state was updated synchronously
    expect(useAuthStore.getState().session).toEqual(mockSession);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it("logout cleanup (WISH-07): onAuthStateChange with session=null clears wishlistItems", async () => {
    const { useAppStore } = await import("@/stores/appStore");
    const { useAuthStore } = await import("@/stores/authStore");

    // Pre-populate wishlist
    useAppStore.setState({
      wishlistItems: [{ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 }],
    });

    let authChangeCallback: (event: string, session: Session | null) => void = () => {};
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
      authChangeCallback = cb as never;
      return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
    });
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    await useAuthStore.getState().initialize();

    // Simulate logout: session becomes null
    authChangeCallback("SIGNED_OUT", null);

    expect(useAppStore.getState().wishlistItems).toEqual([]);
  });

  it("logout cleanup: wishlistItems NOT cleared when session is non-null (login event)", async () => {
    const { useAppStore } = await import("@/stores/appStore");
    const { useAuthStore } = await import("@/stores/authStore");

    // Pre-populate wishlist
    useAppStore.setState({
      wishlistItems: [{ poiId: "ge-tbilisi", countryCode: "GE", daysMin: 2 }],
    });

    let authChangeCallback: (event: string, session: Session | null) => void = () => {};
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
      authChangeCallback = cb as never;
      return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
    });
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await useAuthStore.getState().initialize();

    // Simulate login: session is non-null
    authChangeCallback("SIGNED_IN", mockSession);

    // Wishlist should NOT have been cleared
    expect(useAppStore.getState().wishlistItems).toHaveLength(1);
  });
});
