"use client";

/**
 * Authentication session (Phase 2 — real backend).
 *
 * Login/registration hit the Django/DRF auth endpoints and store JWT tokens;
 * the authenticated user is placed into {@link useDb} so `useCurrentUser()`
 * keeps working unchanged, and the rest of the app data is hydrated from the API.
 */

import { create } from "zustand";

import { api, tokenStore } from "@/lib/api/client";
import { useLanguageStore } from "@/lib/i18n";
import { useDb } from "@/lib/stores/db-store";
import type { User } from "@/lib/types";

interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface NewListenerInput {
  email: string;
  password: string;
  displayName: string;
  gender?: User["gender"];
  birthDate?: string;
}

export interface NewArtistInput {
  name: string;
  email: string;
  password: string;
  portfolio?: string;
}

type SessionStatus = "loading" | "authed" | "anon";

interface SessionState {
  currentUserId: string | null;
  status: SessionStatus;
  login: (email: string, password: string) => Promise<User>;
  registerListener: (input: NewListenerInput) => Promise<User>;
  registerArtist: (input: NewArtistInput) => Promise<User>;
  logout: () => void;
  /** Restore a session from a stored token on app load. */
  bootstrap: () => Promise<void>;
}

/** Adopt the language stored on the account so it follows the user. */
function applyLanguage(user: User) {
  const language = user.preferences?.language;
  if (language) useLanguageStore.getState().setLanguage(language);
}

async function establish(
  set: (partial: Partial<SessionState>) => void,
  data: AuthResponse,
) {
  tokenStore.set(data.access, data.refresh);
  applyLanguage(data.user);
  useDb.getState().setCurrentUserData(data.user);
  set({ currentUserId: data.user.id, status: "authed" });
  await useDb.getState().hydrate(data.user);
}

export const useSession = create<SessionState>((set) => ({
  currentUserId: null,
  status: "loading",

  login: async (email, password) => {
    const data = await api.post<AuthResponse>("/auth/login/", { email, password });
    await establish(set, data);
    return data.user;
  },

  registerListener: async (input) => {
    const data = await api.post<AuthResponse>("/auth/register/", input);
    await establish(set, data);
    return data.user;
  },

  registerArtist: async (input) => {
    const data = await api.post<AuthResponse>("/auth/register-artist/", input);
    await establish(set, data);
    return data.user;
  },

  logout: () => {
    tokenStore.clear();
    useDb.getState().reset();
    set({ currentUserId: null, status: "anon" });
  },

  bootstrap: async () => {
    if (!tokenStore.access) {
      set({ status: "anon" });
      return;
    }
    try {
      const user = await api.get<User>("/auth/me/");
      applyLanguage(user);
      useDb.getState().setCurrentUserData(user);
      set({ currentUserId: user.id, status: "authed" });
      await useDb.getState().hydrate(user);
    } catch {
      tokenStore.clear();
      set({ currentUserId: null, status: "anon" });
    }
  },
}));

/**
 * The logged-in user, reactive to both the session and any edits to the account
 * in the database. Returns null when signed out.
 */
export function useCurrentUser(): User | null {
  const currentUserId = useSession((s) => s.currentUserId);
  return useDb((s) =>
    currentUserId ? (s.users.find((u) => u.id === currentUserId) ?? null) : null,
  );
}
