import { create } from "zustand";

type AuthModalState = {
  isOpen: boolean;
  pendingAction: (() => void) | null;
};

type AuthModalActions = {
  open: (pendingAction?: () => void) => void;
  close: () => void;
  executePending: () => void;
};

export const useAuthModalStore = create<AuthModalState & AuthModalActions>()((set, get) => ({
  isOpen: false,
  pendingAction: null,

  open: (pendingAction) => {
    set({ isOpen: true, pendingAction: pendingAction ?? null });
  },

  close: () => {
    set({ isOpen: false, pendingAction: null });
  },

  executePending: () => {
    const { pendingAction } = get();
    if (pendingAction) pendingAction();
    set({ isOpen: false, pendingAction: null });
  },
}));
