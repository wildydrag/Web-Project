import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { act } from "react";

import { usePlayback } from "@/lib/hooks/use-playback";
import { useDb } from "@/lib/stores/db-store";
import { usePlayer } from "@/lib/stores/player-store";
import { useSession } from "@/lib/stores/session-store";

/**
 * The cover play/pause buttons used to call `playList(..., 0)` unconditionally,
 * so pressing the button while it showed a *pause* icon restarted the album from
 * the first track instead of pausing. These pin the decision that replaced it.
 */

vi.mock("@/lib/api/client", () => ({
  api: { post: vi.fn().mockResolvedValue({}) },
}));

const ALBUM = ["sg_1", "sg_2", "sg_3"];
const OTHER = ["sg_9"];

beforeEach(() => {
  useSession.setState({
    user: {
      id: "us_1", subscriptionTier: "gold", dailyStreams: 0,
    },
  } as never);
  useDb.setState({ incrementDailyStreams: () => {} } as never);
  usePlayer.setState({
    queue: [], baseQueue: [], index: 0, isPlaying: false, positionSec: 0,
  });
});

/**
 * Render once and keep the handle: `result.current` re-renders with the store,
 * so later reads see fresh state.
 */
const playback = () => renderHook(() => usePlayback()).result;

describe("toggleList", () => {
  it("starts a list that is not currently loaded", () => {
    const r = playback();
    act(() => r.current.toggleList(ALBUM));
    expect(usePlayer.getState().queue).toEqual(ALBUM);
    expect(usePlayer.getState().isPlaying).toBe(true);
  });

  it("pauses instead of restarting when the list is already playing", () => {
    const r = playback();
    act(() => r.current.toggleList(ALBUM));
    act(() => usePlayer.setState({ index: 2, positionSec: 30 }));

    act(() => r.current.toggleList(ALBUM));

    const state = usePlayer.getState();
    expect(state.isPlaying).toBe(false);
    // The bug: these would have snapped back to 0.
    expect(state.index).toBe(2);
    expect(state.positionSec).toBe(30);
  });

  it("resumes a paused list from where it stopped", () => {
    const r = playback();
    act(() => r.current.toggleList(ALBUM));
    act(() => usePlayer.setState({ index: 1, positionSec: 12, isPlaying: false }));

    act(() => r.current.toggleList(ALBUM));

    expect(usePlayer.getState().isPlaying).toBe(true);
    expect(usePlayer.getState().positionSec).toBe(12);
  });

  it("switches away to a different list from the top", () => {
    const r = playback();
    act(() => r.current.toggleList(ALBUM));
    act(() => usePlayer.setState({ index: 2 }));

    act(() => r.current.toggleList(OTHER));

    expect(usePlayer.getState().queue).toEqual(OTHER);
    expect(usePlayer.getState().index).toBe(0);
  });

  it("does nothing for an empty list", () => {
    const r = playback();
    act(() => r.current.toggleList([]));
    expect(usePlayer.getState().queue).toEqual([]);
  });
});

describe("what the button should show", () => {
  it("reports the list as playing only while it is sounding", () => {
    const r = playback();
    act(() => r.current.toggleList(ALBUM));
    expect(r.current.isListPlaying(ALBUM)).toBe(true);

    act(() => usePlayer.getState().pause());
    // Loaded but paused: the button must offer play, not pause.
    expect(r.current.isListPlaying(ALBUM)).toBe(false);
    expect(r.current.isCurrentList(ALBUM)).toBe(true);
  });

  it("does not claim an unrelated list is playing", () => {
    const r = playback();
    act(() => r.current.toggleList(ALBUM));
    expect(r.current.isListPlaying(OTHER)).toBe(false);
    expect(r.current.isCurrentList(OTHER)).toBe(false);
  });
});
