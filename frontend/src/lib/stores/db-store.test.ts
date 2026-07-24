import { beforeEach, describe, expect, it, vi } from "vitest";

// The store now talks to the backend; mock the HTTP client so these unit tests
// exercise only the optimistic local updates and assert the right API calls.
vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    del: vi.fn().mockResolvedValue(undefined),
    postForm: vi.fn(),
    patchForm: vi.fn(),
    list: vi.fn(),
  },
  tokenStore: { get access() { return null; }, get refresh() { return null; }, set() {}, clear() {} },
  ApiError: class ApiError extends Error {},
}));

import { api } from "@/lib/api/client";
import type { Artist, Playlist, User } from "@/lib/types";
import { useDb } from "./db-store";

const user = (over: Partial<User> = {}): User =>
  ({
    id: "u1", email: "u@x.app", role: "listener",
    displayName: "U", username: "@nava_1", avatarSeed: "u", gender: "unspecified",
    createdAt: "2026-01-01T00:00:00Z", subscriptionTier: "gold", followingIds: [],
    followerCount: 0, dailyStreams: 0,
    preferences: { language: "fa", volume: 80, notificationsEnabled: true },
    ...over,
  }) as User;

const artist = (over: Partial<Artist> = {}): Artist =>
  ({
    id: "a1", userId: "ua", name: "A", bio: "", avatarSeed: "a", genres: [],
    verified: false, status: "pending", portfolio: "", requestedAt: "2026-01-01T00:00:00Z",
    followerCount: 10, monthlyListeners: 0, totalStreams: 0,
    ...over,
  }) as Artist;

const playlist = (over: Partial<Playlist> = {}): Playlist =>
  ({ id: "p1", ownerId: "u1", name: "P", coverSeed: "p", songIds: [], createdAt: "2026-01-01T00:00:00Z", ...over }) as Playlist;

beforeEach(() => {
  vi.clearAllMocks();
  useDb.getState().reset();
  useDb.setState({
    users: [user()],
    artists: [artist()],
    playlists: [playlist()],
    settings: { prices: { silver: 1, gold: 2 } },
  });
});

describe("toggleFollow (optimistic)", () => {
  it("updates local state and the artist count, and calls the API", () => {
    useDb.getState().toggleFollow("u1", "a1");
    expect(useDb.getState().users[0].followingIds).toContain("a1");
    expect(useDb.getState().artists[0].followerCount).toBe(11);
    expect(api.post).toHaveBeenCalledWith("/auth/me/toggle-follow/", { artistId: "a1" });

    useDb.getState().toggleFollow("u1", "a1");
    expect(useDb.getState().users[0].followingIds).not.toContain("a1");
    expect(useDb.getState().artists[0].followerCount).toBe(10);
  });
});

describe("toggleSongInPlaylist (optimistic)", () => {
  it("adds then removes a song, hitting add-song / remove-song", () => {
    useDb.getState().toggleSongInPlaylist("p1", "sg_01");
    expect(useDb.getState().playlists[0].songIds).toContain("sg_01");
    expect(api.post).toHaveBeenCalledWith("/playlists/p1/add-song/", { songId: "sg_01" });

    useDb.getState().toggleSongInPlaylist("p1", "sg_01");
    expect(useDb.getState().playlists[0].songIds).not.toContain("sg_01");
    expect(api.post).toHaveBeenCalledWith("/playlists/p1/remove-song/", { songId: "sg_01" });
  });
});

describe("artist verification (optimistic)", () => {
  it("approves locally and calls the approve endpoint", () => {
    useDb.getState().approveArtist("a1");
    const a = useDb.getState().artists[0];
    expect(a.status).toBe("approved");
    expect(a.verified).toBe(true);
    expect(api.post).toHaveBeenCalledWith("/artists/a1/approve/");
  });

  it("rejects with a reason and calls the reject endpoint", () => {
    useDb.getState().rejectArtist("a1", "کیفیت کافی نبود");
    expect(useDb.getState().artists[0].status).toBe("rejected");
    expect(api.post).toHaveBeenCalledWith("/artists/a1/reject/", { reason: "کیفیت کافی نبود" });
  });
});

describe("pricing (optimistic)", () => {
  it("updates settings locally and PATCHes platform-settings", () => {
    useDb.getState().updatePrices({ silver: 99000, gold: 199000 });
    expect(useDb.getState().settings.prices).toEqual({ silver: 99000, gold: 199000 });
    expect(api.patch).toHaveBeenCalledWith("/platform-settings/", {
      silverPrice: 99000, goldPrice: 199000,
    });
  });
});
