"use client";

/**
 * The music player transport.
 *
 * This store owns the queue, playing state, position, volume, repeat and
 * shuffle. It deliberately knows nothing about *how* sound is produced:
 * `<PlayerTransport>` holds the `<audio>` element, reports the element's clock
 * through {@link PlayerState.setPosition}, calls
 * {@link PlayerState.handleTrackEnd} when a track finishes, and follows this
 * store's play/pause, volume and seek requests.
 *
 * That split is why the queue logic below survived the move from a simulated
 * clock to real playback without a single change.
 *
 * The store is also free of any database or toast dependency, so playback
 * *policy* (e.g. the basic-tier daily stream cap) lives in the `usePlayback`
 * hook instead and the transport stays trivially testable.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { RepeatMode } from "@/lib/types";

/** Fisher–Yates shuffle that never mutates its input. */
function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface PlayerState {
  /** Active play order (already shuffled when `shuffle` is on). */
  queue: string[];
  /** Canonical insertion order, used to restore order when shuffle turns off. */
  baseQueue: string[];
  /** Index of the current track within `queue`. */
  index: number;

  isPlaying: boolean;
  positionSec: number;
  /**
   * Bumped by {@link PlayerState.seek} and by nothing else.
   *
   * The transport cannot tell a user's seek from its own `timeupdate` echo by
   * looking at `positionSec` alone — while a track plays, the next tick
   * overwrites the requested position before it can be applied, and the seek is
   * silently lost. Watching this counter makes the intent explicit.
   */
  seekRequestId: number;
  /**
   * Where that request wants to land.
   *
   * Kept separate from `positionSec` because the transport applies it
   * asynchronously: by the time the effect runs, another `timeupdate` may have
   * moved `positionSec` on, and reading it then would seek to the wrong place.
   */
  seekTargetSec: number;
  volume: number; // 0–100
  muted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;

  /** Mobile: whether the full-screen player is expanded. */
  isExpanded: boolean;

  // ── Queue control ─────────────────────────────────────────────────────────
  /** Replace the queue with `songIds` and start playing at `startIndex`. */
  playContext: (songIds: string[], startIndex: number) => void;
  /** Play one song within a context list (album, playlist, search results…). */
  playSongInContext: (songIds: string[], songId: string) => void;
  addToQueue: (songId: string) => void;
  playNext: (songId: string) => void;
  removeFromQueue: (index: number) => void;
  /** Jump straight to a track in the queue (used by the queue list). */
  jumpTo: (index: number) => void;
  clearQueue: () => void;

  // ── Transport ─────────────────────────────────────────────────────────────
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (sec: number) => void;
  /** Called by the transport tick to advance the clock. */
  setPosition: (sec: number) => void;
  /** Called by the transport when the current track reaches its end. */
  handleTrackEnd: () => void;

  // ── Modes & output ────────────────────────────────────────────────────────
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setExpanded: (expanded: boolean) => void;
}

/** The id of the track currently loaded, or null when the queue is empty. */
export function currentSongId(state: PlayerState): string | null {
  return state.queue[state.index] ?? null;
}

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      baseQueue: [],
      index: 0,
      isPlaying: false,
      positionSec: 0,
      seekRequestId: 0,
      seekTargetSec: 0,
      volume: 80,
      muted: false,
      repeat: "off",
      shuffle: false,
      isExpanded: false,

      playContext: (songIds, startIndex) => {
        if (songIds.length === 0) return;
        const start = Math.max(0, Math.min(startIndex, songIds.length - 1));
        if (get().shuffle) {
          // Keep the chosen track first, shuffle the rest.
          const rest = shuffled(songIds.filter((_, i) => i !== start));
          set({
            baseQueue: songIds,
            queue: [songIds[start], ...rest],
            index: 0,
            positionSec: 0,
            isPlaying: true,
          });
        } else {
          set({
            baseQueue: songIds,
            queue: songIds,
            index: start,
            positionSec: 0,
            isPlaying: true,
          });
        }
      },

      playSongInContext: (songIds, songId) => {
        const startIndex = Math.max(0, songIds.indexOf(songId));
        get().playContext(songIds, startIndex);
      },

      addToQueue: (songId) =>
        set((s) => ({
          queue: [...s.queue, songId],
          baseQueue: [...s.baseQueue, songId],
        })),

      playNext: (songId) =>
        set((s) => {
          const queue = [...s.queue];
          queue.splice(s.index + 1, 0, songId);
          return { queue };
        }),

      removeFromQueue: (index) =>
        set((s) => {
          if (index === s.index) return s; // never remove the playing track
          const queue = s.queue.filter((_, i) => i !== index);
          return { queue, index: index < s.index ? s.index - 1 : s.index };
        }),

      jumpTo: (index) =>
        set((s) =>
          index >= 0 && index < s.queue.length
            ? { index, positionSec: 0, isPlaying: true }
            : s,
        ),

      clearQueue: () =>
        set({ queue: [], baseQueue: [], index: 0, isPlaying: false, positionSec: 0 }),

      togglePlay: () => {
        if (get().queue.length === 0) return;
        set((s) => ({ isPlaying: !s.isPlaying }));
      },
      play: () => get().queue.length > 0 && set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),

      next: () => {
        const { index, queue, repeat } = get();
        if (queue.length === 0) return;
        if (index < queue.length - 1) {
          set({ index: index + 1, positionSec: 0, isPlaying: true });
        } else if (repeat === "all") {
          set({ index: 0, positionSec: 0, isPlaying: true });
        } else {
          // End of queue with no repeat: rewind and stop.
          set({ positionSec: 0, isPlaying: false });
        }
      },

      previous: () => {
        const { index, positionSec, repeat, queue } = get();
        if (queue.length === 0) return;
        // Restart the current track if we're more than 3s in (familiar behaviour).
        if (positionSec > 3) {
          set({ positionSec: 0 });
          return;
        }
        if (index > 0) {
          set({ index: index - 1, positionSec: 0, isPlaying: true });
        } else if (repeat === "all") {
          set({ index: queue.length - 1, positionSec: 0, isPlaying: true });
        } else {
          set({ positionSec: 0 });
        }
      },

      seek: (sec) =>
        set((s) => {
          const target = Math.max(0, sec);
          return {
            positionSec: target,
            seekTargetSec: target,
            seekRequestId: s.seekRequestId + 1,
          };
        }),
      setPosition: (sec) => set({ positionSec: sec }),

      handleTrackEnd: () => {
        const { repeat } = get();
        if (repeat === "one") {
          set({ positionSec: 0, isPlaying: true });
          return;
        }
        get().next();
      },

      cycleRepeat: () => {
        const order: RepeatMode[] = ["off", "all", "one"];
        set((s) => ({ repeat: order[(order.indexOf(s.repeat) + 1) % order.length] }));
      },

      toggleShuffle: () => {
        const { shuffle, queue, baseQueue, index } = get();
        const playing = queue[index] ?? null;
        if (!shuffle) {
          // Turn on: keep current track first, shuffle the rest.
          const rest = shuffled(baseQueue.filter((id) => id !== playing));
          set({
            shuffle: true,
            queue: playing ? [playing, ...rest] : shuffled(baseQueue),
            index: 0,
          });
        } else {
          // Turn off: restore the canonical order around the current track.
          set({
            shuffle: false,
            queue: baseQueue,
            index: playing ? Math.max(0, baseQueue.indexOf(playing)) : 0,
          });
        }
      },

      setVolume: (volume) =>
        set({ volume: Math.max(0, Math.min(100, Math.round(volume))), muted: false }),
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      setExpanded: (expanded) => set({ isExpanded: expanded }),
    }),
    {
      name: "nava-player",
      // Persist only the user's output/mode preferences, not the transient queue.
      partialize: (s) => ({
        volume: s.volume,
        muted: s.muted,
        repeat: s.repeat,
        shuffle: s.shuffle,
      }),
    },
  ),
);
