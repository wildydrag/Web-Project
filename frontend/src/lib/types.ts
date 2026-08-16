/**
 * Domain model for Nava.
 *
 * These types are the contract between the (Phase 1) mock data layer and the UI.
 * They are intentionally close to what the Phase 2 Django/DRF backend will
 * serialize, so swapping the mock store for real API calls is mostly a matter of
 * replacing the store actions — not reshaping the components.
 */

export type Role = "listener" | "artist" | "support" | "admin";

export type SubscriptionTier = "basic" | "silver" | "gold";

export type Gender = "male" | "female" | "other" | "unspecified";

export type ArtistStatus = "pending" | "approved" | "rejected";

/** A standalone release is a single; otherwise a track belongs to an album. */
export type ReleaseType = "album" | "single";

export type RepeatMode = "off" | "all" | "one";

export type TicketStatus = "open" | "answered" | "closed";

export type PayoutStatus = "pending" | "settled";

export type NotificationKind =
  | "subscription_expiring" // listener: subscription is about to end
  | "new_release" // listener: a followed artist published something
  | "artist_verdict" // artist: approval/rejection result (+ reason)
  | "artist_payout" // artist: monthly financial calculation is ready
  | "new_ticket" // staff: a user opened a support ticket
  | "new_artist_request"; // staff: a new artist signed up and needs review

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

/** Per-user preferences (the "App settings" screen). Synced per account. */
export interface UserPreferences {
  /** UI language. Only `fa` is implemented in Phase 1, but the field is here. */
  language: "fa" | "en";
  /** Master player volume, 0–100. */
  volume: number;
  /** Whether notifications are delivered at all (the "notification limit"). */
  notificationsEnabled: boolean;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  /** Chosen by the user at sign-up. */
  displayName: string;
  /** Assigned by the system, e.g. `@nava_1042`. Distinct from displayName. */
  username: string;
  avatarUrl?: string;
  /** Deterministic seed used to render gradient art when no avatar is set. */
  avatarSeed: string;
  gender: Gender;
  birthDate?: string; // ISO date
  createdAt: string; // ISO date

  // Listener-facing fields (also present on artist accounts, who can listen too)
  subscriptionTier: SubscriptionTier;
  /** When the current paid subscription ends (undefined for basic). */
  subscriptionRenewsAt?: string;
  /** False once a paid plan has lapsed; `subscriptionTier` then reads `basic`. */
  subscriptionIsActive?: boolean;
  /** Ids of users/artists this account follows. */
  followingIds: string[];
  followerCount: number;
  /** Total streams the user played today (against the basic-tier daily cap). */
  dailyStreams: number;

  preferences: UserPreferences;

  /** Present only when `role === "artist"`. Links to the artist profile. */
  artistId?: string;
}

/**
 * Artist profile. A separate entity from `User` because songs/albums reference
 * the artist, and the verification workflow lives here.
 */
export interface Artist {
  id: string;
  userId: string;
  name: string; // artistic / stage name
  bio: string;
  avatarSeed: string;
  avatarUrl?: string;
  genres: string[];
  verified: boolean;
  status: ArtistStatus;
  /** Why a request was rejected (shown to the artist). */
  rejectionReason?: string;
  /** Links/notes submitted as portfolio when applying. */
  portfolio: string;
  requestedAt: string;
  followerCount: number;
  monthlyListeners: number;
  totalStreams: number;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface Song {
  id: string;
  title: string;
  /** Primary artist first, then collaborators. */
  artistIds: string[];
  /** Set when the track is part of an album; undefined for a single. */
  albumId?: string;
  coverSeed: string;
  /** Absolute URL to the uploaded cover image, when the artist attached one. */
  coverUrl?: string | null;
  /** Absolute URL to the uploaded audio file, when the artist attached one. */
  audioUrl?: string | null;
  durationSec: number;
  genre: string;
  releaseDate: string;
  lyrics?: string;
  streamCount: number;
  listenerCount: number;
  /** Gold-tier early access before public release. */
  earlyAccess: boolean;
  /** Earnings in Toman, computed by the backend. Present only for the
   *  credited artist and staff. */
  revenueToman?: number;
}

export interface Album {
  id: string;
  title: string;
  artistIds: string[];
  coverSeed: string;
  /** Absolute URL to the uploaded cover image, when the artist attached one. */
  coverUrl?: string | null;
  releaseDate: string;
  genre: string;
  type: ReleaseType;
  songIds: string[];
  streamCount: number;
  listenerCount: number;
  earlyAccess: boolean;
  /** Earnings in Toman, computed by the backend (artist/staff only). */
  revenueToman?: number;
}
export interface Playlist {
  id: string;
  ownerId: string;
  name: string;
  coverSeed: string;
  /** Absolute URL to an uploaded cover image, when one is set. */
  coverUrl?: string | null;
  songIds: string[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Engagement
// ---------------------------------------------------------------------------

export interface AppNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** Optional deep link (e.g. to a new release or a ticket). */
  href?: string;
}

export interface TicketMessage {
  id: string;
  authorRole: "user" | "support";
  authorName: string;
  body: string;
  createdAt: string;
}

export interface Ticket {
  id: string; // human-readable, e.g. TK-1042
  userId: string;
  userName: string;
  /** Reporter's email, joined by the backend for the support table. */
  userEmail?: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  messages: TicketMessage[];
}

/** One row of the monthly artist-payout audit table (admin dashboard). */
export interface AuditEntry {
  id: string;
  artistId: string;
  artistName: string;
  /** Year-month key, e.g. `1405-03`. */
  period: string;
  uniqueListeners: number;
  totalStreams: number;
  /** Computed in Phase 2 from the real formula; placeholder estimate for now. */
  rewardToman: number;
  status: PayoutStatus;
}

// ---------------------------------------------------------------------------
// Platform settings (admin-controlled, dynamic — no code change to update)
// ---------------------------------------------------------------------------

export interface PlatformSettings {
  /** Monthly price per paid tier, editable by the admin. */
  prices: {
    silver: number;
    gold: number;
  };
}

/** The full shape persisted by the mock data layer. */
export interface NavaDatabase {
  users: User[];
  artists: Artist[];
  songs: Song[];
  albums: Album[];
  playlists: Playlist[];
  notifications: AppNotification[];
  tickets: Ticket[];
  audits: AuditEntry[];
  settings: PlatformSettings;
}
