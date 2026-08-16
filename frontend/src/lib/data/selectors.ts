/**
 * Pure read helpers over the mock database.
 *
 * Components subscribe to the slices they need from {@link useDb} and pass them
 * here. Keeping these as plain functions (no store access) makes them easy to
 * unit test and reuse, and mirrors the kind of "derived" reads the Phase 2 API
 * would expose as aggregated endpoints.
 */

import type {
  Album,
  AppNotification,
  Artist,
  Playlist,
  Song,
  User,
} from "@/lib/types";
import { listSeparator } from "@/lib/format";

export function byId<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

export function getArtist(artists: Artist[], id: string): Artist | undefined {
  return byId(artists, id);
}

export function getArtistsByIds(artists: Artist[], ids: string[]): Artist[] {
  return ids.map((id) => byId(artists, id)).filter((a): a is Artist => Boolean(a));
}

export function primaryArtist(song: Song | Album, artists: Artist[]): Artist | undefined {
  return getArtist(artists, song.artistIds[0]);
}

/** Comma-joined artist names for a song/album ("بنیامین، کاوه" / "Benyamin, Kaveh"). */
export function artistNames(item: Song | Album, artists: Artist[]): string {
  return getArtistsByIds(artists, item.artistIds)
    .map((a) => a.name)
    .join(listSeparator());
}

/** Resolve song ids to songs, preserving the given order. */
export function getSongsByIds(songs: Song[], ids: string[]): Song[] {
  return ids.map((id) => byId(songs, id)).filter((s): s is Song => Boolean(s));
}

export function getAlbumSongs(album: Album, songs: Song[]): Song[] {
  return getSongsByIds(songs, album.songIds);
}

export function getArtistAlbums(albums: Album[], artistId: string): Album[] {
  return albums.filter((a) => a.artistIds.includes(artistId));
}

/** Standalone singles (no album) by an artist. */
export function getArtistSingles(songs: Song[], artistId: string): Song[] {
  return songs.filter((s) => !s.albumId && s.artistIds.includes(artistId));
}

/** Every track that credits an artist (album tracks + singles). */
export function getArtistSongs(songs: Song[], artistId: string): Song[] {
  return songs.filter((s) => s.artistIds.includes(artistId));
}

export function getUserPlaylists(playlists: Playlist[], userId: string): Playlist[] {
  return playlists.filter((p) => p.ownerId === userId);
}

export function getUserNotifications(
  notifications: AppNotification[],
  userId: string,
): AppNotification[] {
  return notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function unreadNotificationCount(
  notifications: AppNotification[],
  userId: string,
): number {
  return notifications.filter((n) => n.userId === userId && !n.read).length;
}

export function getPendingArtists(artists: Artist[]): Artist[] {
  return artists.filter((a) => a.status === "pending");
}

/**
 * The library grid mixes album cards and standalone-single cards. This returns a
 * unified, discriminated list so the page can render either kind.
 */
export type LibraryItem =
  | { kind: "album"; album: Album; sortDate: string; streams: number; title: string }
  | { kind: "single"; song: Song; sortDate: string; streams: number; title: string };

export function getLibraryItems(albums: Album[], songs: Song[]): LibraryItem[] {
  const albumItems: LibraryItem[] = albums.map((album) => ({
    kind: "album",
    album,
    sortDate: album.releaseDate,
    streams: album.streamCount,
    title: album.title,
  }));
  const singleItems: LibraryItem[] = songs
    .filter((s) => !s.albumId)
    .map((song) => ({
      kind: "single",
      song,
      sortDate: song.releaseDate,
      streams: song.streamCount,
      title: song.title,
    }));
  return [...albumItems, ...singleItems];
}

/** Whether a release should be hidden from a user (gold-only early access). */
export function isVisibleToUser(
  item: { earlyAccess: boolean; releaseDate: string },
  user: User | null,
): boolean {
  if (!item.earlyAccess) return true;
  // Gold members get early access; everyone else waits for the release date.
  if (user?.subscriptionTier === "gold") return true;
  return new Date(item.releaseDate).getTime() <= Date.now();
}
