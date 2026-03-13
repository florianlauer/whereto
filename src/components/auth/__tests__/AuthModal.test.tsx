import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";

// Mock supabase before importing stores
vi.mock("@/lib/supabase");

// We'll import these after creating them
import { useAuthModalStore } from "@/stores/authModalStore";
import { useAuthStore } from "@/stores/authStore";

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

describe("authModalStore", () => {
  beforeEach(() => {
    useAuthModalStore.setState({ isOpen: false, pendingAction: null });
  });

  it("opens modal and stores pending action", () => {
    const action = vi.fn();
    useAuthModalStore.getState().open(action);

    expect(useAuthModalStore.getState().isOpen).toBe(true);
    expect(useAuthModalStore.getState().pendingAction).toBe(action);
  });

  it("opens modal without pending action", () => {
    useAuthModalStore.getState().open();

    expect(useAuthModalStore.getState().isOpen).toBe(true);
    expect(useAuthModalStore.getState().pendingAction).toBeNull();
  });

  it("closes modal and clears pending action", () => {
    const action = vi.fn();
    useAuthModalStore.setState({ isOpen: true, pendingAction: action });

    useAuthModalStore.getState().close();

    expect(useAuthModalStore.getState().isOpen).toBe(false);
    expect(useAuthModalStore.getState().pendingAction).toBeNull();
  });

  it("executePending calls action then closes", () => {
    const action = vi.fn();
    useAuthModalStore.setState({ isOpen: true, pendingAction: action });

    useAuthModalStore.getState().executePending();

    expect(action).toHaveBeenCalledOnce();
    expect(useAuthModalStore.getState().isOpen).toBe(false);
    expect(useAuthModalStore.getState().pendingAction).toBeNull();
  });

  it("executePending closes even without action", () => {
    useAuthModalStore.setState({ isOpen: true, pendingAction: null });

    useAuthModalStore.getState().executePending();

    expect(useAuthModalStore.getState().isOpen).toBe(false);
  });
});

describe("useAuthGatedAction", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, session: null, loading: false });
    useAuthModalStore.setState({ isOpen: false, pendingAction: null });
    sessionStorage.clear();
  });

  it("always executes the action even when anonymous", async () => {
    const { useAuthGatedAction } = await import("@/hooks/useAuthGatedAction");
    const action = vi.fn();

    function TestComponent() {
      const gateAction = useAuthGatedAction();
      return <button onClick={() => gateAction(action)}>Save</button>;
    }

    render(<TestComponent />);
    fireEvent.click(screen.getByText("Save"));

    expect(action).toHaveBeenCalledOnce();
  });

  it("opens modal after 3rd anonymous add", async () => {
    const { useAuthGatedAction } = await import("@/hooks/useAuthGatedAction");
    const action = vi.fn();

    function TestComponent() {
      const gateAction = useAuthGatedAction();
      return <button onClick={() => gateAction(action)}>Save</button>;
    }

    render(<TestComponent />);

    fireEvent.click(screen.getByText("Save"));
    expect(useAuthModalStore.getState().isOpen).toBe(false);

    fireEvent.click(screen.getByText("Save"));
    expect(useAuthModalStore.getState().isOpen).toBe(false);

    fireEvent.click(screen.getByText("Save"));
    expect(useAuthModalStore.getState().isOpen).toBe(true);
    expect(action).toHaveBeenCalledTimes(3);
  });

  it("does not re-prompt after modal was already shown this session", async () => {
    sessionStorage.setItem("auth_prompt_shown", "1");
    const { useAuthGatedAction } = await import("@/hooks/useAuthGatedAction");

    function TestComponent() {
      const gateAction = useAuthGatedAction();
      return <button onClick={() => gateAction(() => {})}>Save</button>;
    }

    render(<TestComponent />);
    fireEvent.click(screen.getByText("Save"));

    expect(useAuthModalStore.getState().isOpen).toBe(false);
  });

  it("never shows modal for authenticated users", async () => {
    useAuthStore.setState({ user: mockUser, session: null, loading: false });
    const { useAuthGatedAction } = await import("@/hooks/useAuthGatedAction");
    const action = vi.fn();

    function TestComponent() {
      const gateAction = useAuthGatedAction();
      return <button onClick={() => gateAction(action)}>Save</button>;
    }

    render(<TestComponent />);
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByText("Save"));

    expect(action).toHaveBeenCalledTimes(5);
    expect(useAuthModalStore.getState().isOpen).toBe(false);
  });
});

describe("AuthModal", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, session: null, loading: false });
    useAuthModalStore.setState({ isOpen: false, pendingAction: null });
  });

  it("does not render when isOpen is false", async () => {
    const { AuthModal } = await import("@/components/auth/AuthModal");

    render(<AuthModal />);

    expect(screen.queryByText("Se connecter")).not.toBeInTheDocument();
  });

  it("renders modal with sign-in title when open", async () => {
    useAuthModalStore.setState({ isOpen: true });
    const { AuthModal } = await import("@/components/auth/AuthModal");

    render(<AuthModal />);

    expect(screen.getByRole("heading", { name: "Se connecter" })).toBeInTheDocument();
  });

  it("shows three sign-in methods", async () => {
    useAuthModalStore.setState({ isOpen: true });
    const { AuthModal } = await import("@/components/auth/AuthModal");

    render(<AuthModal />);

    // Google OAuth button
    expect(screen.getByText("Continuer avec Google")).toBeInTheDocument();
    // Email/password form (default tab)
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
    // Magic link tab
    expect(screen.getByText("Lien magique")).toBeInTheDocument();
  });

  it('shows "Continuer sans compte" button that closes modal (AUTH-06)', async () => {
    useAuthModalStore.setState({ isOpen: true });
    const { AuthModal } = await import("@/components/auth/AuthModal");

    render(<AuthModal />);

    const continueButton = screen.getByText("Continuer sans compte");
    expect(continueButton).toBeInTheDocument();

    fireEvent.click(continueButton);

    expect(useAuthModalStore.getState().isOpen).toBe(false);
  });

  it("auto-closes and executes pending action on auth success", async () => {
    const pendingAction = vi.fn();
    useAuthModalStore.setState({ isOpen: true, pendingAction });
    const { AuthModal } = await import("@/components/auth/AuthModal");

    render(<AuthModal />);

    // Simulate auth success by setting user
    act(() => {
      useAuthStore.setState({ user: mockUser });
    });

    expect(useAuthModalStore.getState().isOpen).toBe(false);
    expect(pendingAction).toHaveBeenCalledOnce();
  });

  it("closes on Escape key", async () => {
    useAuthModalStore.setState({ isOpen: true });
    const { AuthModal } = await import("@/components/auth/AuthModal");

    render(<AuthModal />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(useAuthModalStore.getState().isOpen).toBe(false);
  });
});
