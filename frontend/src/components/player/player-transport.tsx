"use client";

import { useEffect, useRef } from "react";

import { byId } from "@/lib/data/selectors";
import { useDb } from "@/lib/stores/db-store";
import { currentSongId, usePlayer } from "@/lib/stores/player-store";

/** How often the simulated clock advances for tracks with no audio file. */
const TICK_MS = 250;

/**
 * Drives playback for the current track.
 *
 * The real transport is an `<audio>` element: its `timeupdate` feeds
 * {@link usePlayer.setPosition} and its `ended` calls `handleTrackEnd`, while
 * play/pause, volume, mute and seeking are pushed the other way. All of the
 * queue, repeat and shuffle logic stays in the store, untouched.
 *
 * A track with no uploaded audio falls back to the simulated clock this
 * component used to run for everything. That keeps a partially-filled catalogue
 * usable — the queue still advances instead of stalling on a silent track.
 */
export function PlayerTransport() {
  const audioRef = useRef<HTMLAudioElement>(null);

  const isPlaying = usePlayer((s) => s.isPlaying);
  const songId = usePlayer(currentSongId);
  const seekRequestId = usePlayer((s) => s.seekRequestId);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const setPosition = usePlayer((s) => s.setPosition);
  const handleTrackEnd = usePlayer((s) => s.handleTrackEnd);
  const pause = usePlayer((s) => s.pause);

  const songs = useDb((s) => s.songs);
  const song = songId ? byId(songs, songId) : null;
  const src = song?.audioUrl ?? null;
  const duration = song?.durationSec ?? 0;

  // ── Load a new track ──────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (src) {
      audio.src = src;
      audio.load();
    } else {
      // Moving to a track with no file: stop the previous one rather than
      // leaving it audible under a different title.
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
  }, [src]);

  // ── Play / pause follows the store ────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (isPlaying) {
      // A browser may refuse to start audio without a user gesture; if it does,
      // put the store back in sync rather than showing a lying "playing" state.
      audio.play().catch(() => pause());
    } else {
      audio.pause();
    }
  }, [isPlaying, src, pause]);

  // ── Output settings follow the store ──────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, volume / 100));
    audio.muted = muted;
  }, [volume, muted]);

  // ── Seeking: store → element ──────────────────────────────────────────────
  // Driven by `seekRequestId`, not by `positionSec`. Comparing positions cannot
  // work: while a track plays, a `timeupdate` lands between the click and this
  // effect and overwrites the requested position, so the seek is lost — which is
  // exactly what "clicking the bar does nothing" looked like.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src || seekRequestId === 0) return;
    audio.currentTime = usePlayer.getState().seekTargetSec;
  }, [seekRequestId, src]);

  // ── Simulated clock, only for tracks with no audio ────────────────────────
  useEffect(() => {
    if (src) return; // the element drives the clock instead
    if (!isPlaying || duration <= 0) return;

    const interval = setInterval(() => {
      const { positionSec: at } = usePlayer.getState();
      if (at + TICK_MS / 1000 >= duration) handleTrackEnd();
      else setPosition(at + TICK_MS / 1000);
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [src, isPlaying, duration, setPosition, handleTrackEnd]);

  return (
    <audio
      ref={audioRef}
      preload="metadata"
      onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
      onEnded={handleTrackEnd}
      // A file that will not load must not freeze the queue. Guarded on `src`
      // so clearing the element does not count as a failure and skip a track.
      onError={() => {
        if (src) handleTrackEnd();
      }}
      className="hidden"
    />
  );
}
