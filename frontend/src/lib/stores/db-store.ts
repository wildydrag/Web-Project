"use client";

/**
 * The Nava data store (Phase 2 — backed by the Django/DRF API).
 *
 * ── Phase 2 seam (now crossed) ─────────────────────────────────────────────
 * This store keeps the exact same component-facing shape ({@link NavaDatabase})
 * and action names it had in Phase 1, but the bodies now talk to the backend:
 * {@link DbState.hydrate} fills the arrays from the API, and each mutation does
 * an optimistic local update plus a background API call. Because the interface
 * is unchanged, the ~45 components that read `useDb` selectors and call these
 * actions did not need to change.
 */

import { create } from "zustand";
import { toast } from "sonner";

import { api } from "@/lib/api/client";
import type {
  Album,
  AppNotification,
  Artist,
  NavaDatabase,
  Playlist,
  Song,
  SubscriptionTier,
  TicketStatus,
  User,
} from "@/lib/types";

export interface PublishSingleInput {
  title: string;
  genre: string;
  durationSec: number;
  releaseDate: string;
  lyrics?: string;
  collaboratorIds?: string[];
}

export interface PublishAlbumInput {
  title: string;
  genre: string;
  releaseDate: string;
  collaboratorIds?: string[];
  tracks: { title: string; durationSec: number; lyrics?: string }[];
}

/** Fire-and-forget a background sync; surface failures without blocking the UI. */
function bg(promise: Promise<unknown>) {
  promise.catch((error) => {
    console.error("[nava sync]", error);
    toast.error("همگام‌سازی با سرور ناموفق بود");
  });
}

const EMPTY: NavaDatabase = {
  users: [],
  artists: [],
  songs: [],
  albums: [],
  playlists: [],
  notifications: [],
  tickets: [],
  audits: [],
  settings: { prices: { silver: 0, gold: 0 } },
};

interface DbActions {
  /** Load the current user's data from the API into the store. */
  hydrate: (user: User) => Promise<void>;
  /** Merge the authenticated account into `users` (called on login/bootstrap). */
  setCurrentUserData: (user: User) => void;
  /** Clear everything (logout). */
  reset: () => void;
  resetDatabase: () => void;

  // Accounts -----------------------------------------------------------------
  updateUser: (userId: string, patch: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  toggleFollow: (userId: string, targetId: string) => void;
  setSubscription: (userId: string, tier: SubscriptionTier) => void;
  incrementDailyStreams: (userId: string) => void;

  // Artist verification ------------------------------------------------------
  approveArtist: (artistId: string) => void;
  rejectArtist: (artistId: string, reason: string) => void;

  // Catalog (artist studio) --------------------------------------------------
  publishSingle: (artistId: string, input: PublishSingleInput) => Promise<Song | null>;
  publishAlbum: (artistId: string, input: PublishAlbumInput) => Promise<Album | null>;
  updateSong: (songId: string, patch: Partial<Song>) => void;
  updateAlbum: (albumId: string, patch: Partial<Album>) => void;
  deleteSong: (songId: string) => void;
  deleteAlbum: (albumId: string) => void;

  // Playlists ----------------------------------------------------------------
  createPlaylist: (ownerId: string, name: string) => Promise<Playlist | null>;
  renamePlaylist: (playlistId: string, name: string) => void;
  deletePlaylist: (playlistId: string) => void;
  toggleSongInPlaylist: (playlistId: string, songId: string) => void;

  // Notifications ------------------------------------------------------------
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  deleteNotification: (notificationId: string) => void;

  // Support tickets ----------------------------------------------------------
  replyToTicket: (ticketId: string, body: string, authorName: string) => void;
  setTicketStatus: (ticketId: string, status: TicketStatus) => void;

  // Audit / payouts ----------------------------------------------------------
  settlePayout: (auditId: string) => void;

  // Platform settings --------------------------------------------------------
  updatePrices: (prices: { silver: number; gold: number }) => void;
}

export type DbState = NavaDatabase & DbActions;

export const useDb = create<DbState>()((set, get) => ({
  ...EMPTY,

  // ── Bootstrap ───────────────────────────────────────────────────────────
  hydrate: async (user) => {
    const isStaff = user.role === "support" || user.role === "admin";
    const isAdmin = user.role === "admin";
    const [artists, songs, albums, playlists, notifications, prices] = await Promise.all([
      api.list<Artist>("/artists/"),
      api.list<Song>("/songs/"),
      api.list<Album>("/albums/"),
      api.list<Playlist>("/playlists/"),
      api.list<AppNotification>("/notifications/"),
      api.get<{ silverPrice: number; goldPrice: number }>("/platform-settings/"),
    ]);
    const tickets = isStaff ? await api.list<NavaDatabase["tickets"][number]>("/tickets/") : [];
    const audits = isAdmin ? await api.list<NavaDatabase["audits"][number]>("/dashboard/audits/") : [];
    set((s) => ({
      artists,
      songs,
      albums,
      playlists,
      notifications,
      tickets,
      audits,
      settings: { prices: { silver: prices.silverPrice, gold: prices.goldPrice } },
      users: [user, ...s.users.filter((u) => u.id !== user.id)],
    }));
  },

  setCurrentUserData: (user) =>
    set((s) => ({ users: [user, ...s.users.filter((u) => u.id !== user.id)] })),

  reset: () => set({ ...EMPTY }),
  resetDatabase: () => {
    const user = get().users.find(Boolean);
    if (user) bg(get().hydrate(user));
  },

  // ── Accounts ─────────────────────────────────────────────────────────────
  updateUser: (userId, patch) => {
    set((s) => ({ users: s.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)) }));
    // Only the current account is server-editable via /auth/me.
    const { preferences, displayName, gender, birthDate } = patch;
    const body: Record<string, unknown> = {};
    if (displayName !== undefined) body.displayName = displayName;
    if (gender !== undefined) body.gender = gender;
    if (birthDate !== undefined) body.birthDate = birthDate;
    if (preferences !== undefined) body.preferences = preferences;
    if (Object.keys(body).length) bg(api.patch("/auth/me/", body));
  },

  deleteUser: (userId) => {
    set((s) => ({
      users: s.users.filter((u) => u.id !== userId),
      playlists: s.playlists.filter((p) => p.ownerId !== userId),
      notifications: s.notifications.filter((n) => n.userId !== userId),
    }));
    bg(api.del("/auth/me/"));
  },

  toggleFollow: (userId, targetId) => {
    set((s) => ({
      users: s.users.map((u) => {
        if (u.id !== userId) return u;
        const following = u.followingIds.includes(targetId);
        return {
          ...u,
          followingIds: following
            ? u.followingIds.filter((id) => id !== targetId)
            : [...u.followingIds, targetId],
        };
      }),
      artists: s.artists.map((a) => {
        if (a.id !== targetId) return a;
        const wasFollowing = s.users
          .find((u) => u.id === userId)
          ?.followingIds.includes(targetId);
        return { ...a, followerCount: a.followerCount + (wasFollowing ? -1 : 1) };
      }),
    }));
    bg(api.post("/auth/me/toggle-follow/", { artistId: targetId }));
  },

  setSubscription: (userId, tier) =>
    // The real purchase happens through the subscription/checkout flow; this
    // keeps the optimistic local reflection for immediate UI feedback.
    set((s) => ({
      users: s.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              subscriptionTier: tier,
              subscriptionRenewsAt:
                tier === "basic"
                  ? undefined
                  : new Date(Date.now() + 30 * 864e5).toISOString(),
            }
          : u,
      ),
    })),

  incrementDailyStreams: (userId) =>
    // The play endpoint records the stream server-side; this bumps the local
    // counter so the "remaining" UI updates instantly.
    set((s) => ({
      users: s.users.map((u) =>
        u.id === userId ? { ...u, dailyStreams: u.dailyStreams + 1 } : u,
      ),
    })),

  // ── Artist verification ────────────────────────────────────────────────
  approveArtist: (artistId) => {
    set((s) => ({
      artists: s.artists.map((a) =>
        a.id === artistId
          ? { ...a, status: "approved", verified: true, rejectionReason: undefined }
          : a,
      ),
    }));
    bg(api.post(`/artists/${artistId}/approve/`));
  },

  rejectArtist: (artistId, reason) => {
    set((s) => ({
      artists: s.artists.map((a) =>
        a.id === artistId
          ? { ...a, status: "rejected", verified: false, rejectionReason: reason }
          : a,
      ),
    }));
    bg(api.post(`/artists/${artistId}/reject/`, { reason }));
  },

  // ── Catalog ──────────────────────────────────────────────────────────────
  publishSingle: async (_artistId, input) => {
    try {
      const song = await api.post<Song>("/songs/", {
        title: input.title,
        genre: input.genre,
        durationSec: input.durationSec,
        releaseDate: input.releaseDate,
        lyrics: input.lyrics ?? "",
        collaboratorIds: input.collaboratorIds ?? [],
      });
      set((s) => ({ songs: [song, ...s.songs] }));
      return song;
    } catch (error) {
      console.error("[nava publishSingle]", error);
      toast.error("انتشار تک‌آهنگ ناموفق بود");
      return null;
    }
  },

  publishAlbum: async (_artistId, input) => {
    try {
      const album = await api.post<Album>("/albums/", {
        title: input.title,
        genre: input.genre,
        releaseDate: input.releaseDate,
        collaboratorIds: input.collaboratorIds ?? [],
        tracks: input.tracks.map((t) => ({
          title: t.title,
          durationSec: t.durationSec,
          lyrics: t.lyrics ?? "",
        })),
      });
      set((s) => ({ albums: [album, ...s.albums] }));
      bg(get().hydrate(get().users.find(Boolean)!)); // refresh songs list
      return album;
    } catch (error) {
      console.error("[nava publishAlbum]", error);
      toast.error("انتشار آلبوم ناموفق بود");
      return null;
    }
  },

  updateSong: (songId, patch) => {
    set((s) => ({
      songs: s.songs.map((song) => (song.id === songId ? { ...song, ...patch } : song)),
    }));
    const body: Record<string, unknown> = {};
    if (patch.title !== undefined) body.title = patch.title;
    if (patch.lyrics !== undefined) body.lyrics = patch.lyrics;
    if (Object.keys(body).length) bg(api.patch(`/songs/${songId}/`, body));
  },

  updateAlbum: (albumId, patch) => {
    set((s) => ({
      albums: s.albums.map((album) => (album.id === albumId ? { ...album, ...patch } : album)),
    }));
    if (patch.title !== undefined) bg(api.patch(`/albums/${albumId}/`, { title: patch.title }));
  },

  deleteSong: (songId) => {
    set((s) => ({
      songs: s.songs.filter((song) => song.id !== songId),
      albums: s.albums.map((a) => ({ ...a, songIds: a.songIds.filter((id) => id !== songId) })),
      playlists: s.playlists.map((p) => ({ ...p, songIds: p.songIds.filter((id) => id !== songId) })),
    }));
    bg(api.del(`/songs/${songId}/`));
  },

  deleteAlbum: (albumId) => {
    const removed = new Set(
      get().songs.filter((song) => song.albumId === albumId).map((song) => song.id),
    );
    set((s) => ({
      albums: s.albums.filter((a) => a.id !== albumId),
      songs: s.songs.filter((song) => song.albumId !== albumId),
      playlists: s.playlists.map((p) => ({
        ...p,
        songIds: p.songIds.filter((id) => !removed.has(id)),
      })),
    }));
    bg(api.del(`/albums/${albumId}/`));
  },

  // ── Playlists ──────────────────────────────────────────────────────────
  createPlaylist: async (_ownerId, name) => {
    try {
      const playlist = await api.post<Playlist>("/playlists/", { name });
      set((s) => ({ playlists: [...s.playlists, playlist] }));
      return playlist;
    } catch (error) {
      console.error("[nava createPlaylist]", error);
      return null; // caller surfaces the tier-limit message
    }
  },

  renamePlaylist: (playlistId, name) => {
    set((s) => ({
      playlists: s.playlists.map((p) => (p.id === playlistId ? { ...p, name } : p)),
    }));
    bg(api.patch(`/playlists/${playlistId}/`, { name }));
  },

  deletePlaylist: (playlistId) => {
    set((s) => ({ playlists: s.playlists.filter((p) => p.id !== playlistId) }));
    bg(api.del(`/playlists/${playlistId}/`));
  },

  toggleSongInPlaylist: (playlistId, songId) => {
    const playlist = get().playlists.find((p) => p.id === playlistId);
    const has = playlist?.songIds.includes(songId) ?? false;
    set((s) => ({
      playlists: s.playlists.map((p) => {
        if (p.id !== playlistId) return p;
        return {
          ...p,
          songIds: has ? p.songIds.filter((id) => id !== songId) : [...p.songIds, songId],
        };
      }),
    }));
    const path = `/playlists/${playlistId}/${has ? "remove-song" : "add-song"}/`;
    bg(api.post(path, { songId }));
  },

  // ── Notifications ────────────────────────────────────────────────────────
  markNotificationRead: (notificationId) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n,
      ),
    }));
    bg(api.post(`/notifications/${notificationId}/mark-read/`));
  },

  markAllNotificationsRead: (userId) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.userId === userId ? { ...n, read: true } : n,
      ),
    }));
    bg(api.post("/notifications/mark-all-read/"));
  },

  deleteNotification: (notificationId) => {
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== notificationId),
    }));
    bg(api.del(`/notifications/${notificationId}/`));
  },

  // ── Tickets ────────────────────────────────────────────────────────────
  replyToTicket: (ticketId, body, authorName) => {
    set((s) => ({
      tickets: s.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: "answered",
              messages: [
                ...t.messages,
                {
                  id: `tm_${Math.random().toString(36).slice(2, 8)}`,
                  authorRole: "support",
                  authorName,
                  body,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : t,
      ),
    }));
    bg(api.post(`/tickets/${ticketId}/reply/`, { body }));
  },

  setTicketStatus: (ticketId, status) => {
    set((s) => ({
      tickets: s.tickets.map((t) => (t.id === ticketId ? { ...t, status } : t)),
    }));
    bg(api.post(`/tickets/${ticketId}/set-status/`, { status }));
  },

  // ── Audit / payouts ──────────────────────────────────────────────────────
  settlePayout: (auditId) => {
    set((s) => ({
      audits: s.audits.map((a) => (a.id === auditId ? { ...a, status: "settled" } : a)),
    }));
    bg(api.post(`/dashboard/audits/${auditId}/settle/`));
  },

  // ── Settings ─────────────────────────────────────────────────────────────
  updatePrices: (prices) => {
    set(() => ({ settings: { prices } }));
    bg(api.patch("/platform-settings/", { silverPrice: prices.silver, goldPrice: prices.gold }));
  },
}));
