import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

import { PlayerTransport } from "./player-transport";
import { useDb } from "@/lib/stores/db-store";
import { usePlayer } from "@/lib/stores/player-store";
import type { Song } from "@/lib/types";

/**
 * The transport used to be a `setInterval` that never loaded a file, so a
 * published track played nothing. These tests pin the behaviour that replaced
 * it: the element is the clock, and the store follows it.
 *
 * jsdom does not implement playback, so `play`/`pause`/`load` are stubbed —
 * what is asserted is the wiring between element events and the store.
 */

const song = (over: Partial<Song> = {}): Song => ({
  id: "sg_1",
  title: "آهنگ",
  artistIds: ["ar_1"],
  coverSeed: "s",
  durationSec: 8,
  genre: "پاپ",
  releaseDate: "2026-01-01",
  streamCount: 0,
  listenerCount: 0,
  earlyAccess: false,
  audioUrl: "http://localhost:8001/media/audio/sg_1.wav",
  ...over,
});

function setCatalog(songs: Song[]) {
  useDb.setState({ songs } as never);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal("HTMLMediaElement", window.HTMLMediaElement);
  vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(window.HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  usePlayer.setState({
    queue: ["sg_1"], baseQueue: ["sg_1"], index: 0,
    isPlaying: false, positionSec: 0, volume: 80, muted: false,
    repeat: "off", shuffle: false,
  });
  setCatalog([song()]);
});

function renderTransport() {
  const { container } = render(<PlayerTransport />);
  const audio = container.querySelector("audio");
  if (!audio) throw new Error("no <audio> element rendered");
  return audio;
}

describe("loading the track", () => {
  it("points the element at the song's audio", () => {
    expect(renderTransport().src).toContain("sg_1.wav");
  });

  it("renders an element even when the song has no audio", () => {
    setCatalog([song({ audioUrl: null })]);
    expect(renderTransport().getAttribute("src")).toBeNull();
  });
});

describe("the element drives the clock", () => {
  it("publishes its position as the track plays", () => {
    const audio = renderTransport();
    Object.defineProperty(audio, "currentTime", { value: 3.5, configurable: true });
    act(() => {
      audio.dispatchEvent(new Event("timeupdate"));
    });
    expect(usePlayer.getState().positionSec).toBeCloseTo(3.5);
  });

  it("advances the queue when the track finishes", () => {
    const handleTrackEnd = vi.spyOn(usePlayer.getState(), "handleTrackEnd");
    const audio = renderTransport();
    act(() => {
      audio.dispatchEvent(new Event("ended"));
    });
    expect(handleTrackEnd).toHaveBeenCalled();
  });

  it("does not stall the queue on a file that will not load", () => {
    // Previously an unplayable file left the player stuck on a silent track.
    const before = usePlayer.getState().index;
    usePlayer.setState({ queue: ["sg_1", "sg_2"], baseQueue: ["sg_1", "sg_2"], index: 0 });
    const audio = renderTransport();
    act(() => {
      audio.dispatchEvent(new Event("error"));
    });
    expect(usePlayer.getState().index).toBeGreaterThan(before);
  });
});

describe("the store drives the element", () => {
  it("plays when the store says playing", () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    renderTransport();
    act(() => usePlayer.getState().play());
    expect(play).toHaveBeenCalled();
  });

  it("pauses when the store pauses", () => {
    const pause = vi.spyOn(window.HTMLMediaElement.prototype, "pause");
    usePlayer.setState({ isPlaying: true });
    renderTransport();
    act(() => usePlayer.getState().pause());
    expect(pause).toHaveBeenCalled();
  });

  it("mirrors volume onto the element", () => {
    const audio = renderTransport();
    act(() => usePlayer.getState().setVolume(40));
    expect(audio.volume).toBeCloseTo(0.4);
  });

  it("mirrors mute onto the element", () => {
    const audio = renderTransport();
    act(() => usePlayer.getState().toggleMute());
    expect(audio.muted).toBe(true);
  });

  it("applies a seek to the element", () => {
    const audio = renderTransport();
    act(() => usePlayer.getState().seek(120));
    expect(audio.currentTime).toBeCloseTo(120);
  });

  it("falls back to paused when the browser refuses to start audio", async () => {
    // Autoplay policy can reject play(); the UI must not claim to be playing.
    vi.spyOn(window.HTMLMediaElement.prototype, "play").mockRejectedValue(
      new DOMException("NotAllowedError"),
    );
    renderTransport();
    await act(async () => {
      usePlayer.getState().play();
      await Promise.resolve();
    });
    expect(usePlayer.getState().isPlaying).toBe(false);
  });
});
