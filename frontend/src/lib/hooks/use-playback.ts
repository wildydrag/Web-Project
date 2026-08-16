"use client";

/**
 * Playback *policy* on top of the pure transport.
 *
 * The {@link usePlayer} store knows how to play a queue; this hook decides
 * whether the current user is *allowed* to start a new stream (the basic-tier
 * daily cap from the brief) and records the stream against their account.
 * Keeping policy here means every "play" button shares one rule set and the
 * transport store stays dependency-free.
 */

import { toast } from "sonner";

import { api } from "@/lib/api/client";
import { TIERS } from "@/lib/config";
import { useDb } from "@/lib/stores/db-store";
import { currentSongId, usePlayer } from "@/lib/stores/player-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { tr } from "@/lib/i18n";

export function usePlayback() {
  const user = useCurrentUser();
  const playContext = usePlayer((s) => s.playContext);
  const playSongInContext = usePlayer((s) => s.playSongInContext);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const currentId = usePlayer(currentSongId);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const incrementDailyStreams = useDb((s) => s.incrementDailyStreams);

  const remaining = user
    ? TIERS[user.subscriptionTier].dailyStreamLimit - user.dailyStreams
    : Infinity;

  const canStartStream = remaining > 0;

  /** Returns false (and warns) when the daily cap has been reached. */
  function guardCap(): boolean {
    if (canStartStream) return true;
    toast.error(tr("به سقف استریم روزانه رسیدید"), {
      description: tr("برای استریم نامحدود، اشتراک خود را ارتقا دهید."),
    });
    return false;
  }

  function recordStream(songId: string) {
    if (!user) return;
    incrementDailyStreams(user.id); // instant local feedback
    // Persist the play server-side (records the StreamEvent + enforces the cap).
    api.post(`/songs/${songId}/play/`).catch((error) => console.error("[nava play]", error));
  }

  return {
    canStartStream,
    remaining,
    /** Play one song within a context list (album, playlist, search results). */
    playSong(songIds: string[], songId: string) {
      if (!guardCap()) return;
      playSongInContext(songIds, songId);
      recordStream(songId);
    },
    /** Play a whole list starting at an index. */
    playList(songIds: string[], startIndex = 0) {
      if (songIds.length === 0 || !guardCap()) return;
      playContext(songIds, startIndex);
      recordStream(songIds[startIndex] ?? songIds[0]);
    },

    /** True when the track now loaded belongs to `songIds`. */
    isCurrentList(songIds: string[]) {
      return currentId !== null && songIds.includes(currentId);
    },

    /** True when a track from `songIds` is loaded *and* sounding. */
    isListPlaying(songIds: string[]) {
      return isPlaying && currentId !== null && songIds.includes(currentId);
    },

    /**
     * What a cover's play/pause button should do.
     *
     * If this list is already the one loaded, pause or resume it; only start it
     * from the top when it is not. Restarting a list whose button is showing a
     * pause icon is the bug this replaces.
     */
    toggleList(songIds: string[]) {
      if (songIds.length === 0) return;
      if (currentId !== null && songIds.includes(currentId)) {
        togglePlay();
        return;
      }
      if (!guardCap()) return;
      playContext(songIds, 0);
      recordStream(songIds[0]);
    },
  };
}
