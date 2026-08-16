import { afterEach, describe, expect, it, vi } from "vitest";

import { readAudioDuration } from "@/lib/audio-duration";

/**
 * jsdom cannot decode audio, so these drive a stand-in element and fire the
 * events a real browser would. What is under test is the promise contract:
 * a sensible number when the browser knows the length, and `null` — never a
 * guess — when it does not, so the caller keeps whatever the artist typed.
 */

type FakeAudio = {
  preload: string;
  src: string;
  duration: number;
  onloadedmetadata: (() => void) | null;
  onerror: (() => void) | null;
};

function stubAudio(configure: (el: FakeAudio) => void) {
  const element: FakeAudio = {
    preload: "",
    duration: NaN,
    onloadedmetadata: null,
    onerror: null,
    // Setting `src` is what kicks a real element into loading.
    set src(_value: string) {
      queueMicrotask(() => configure(element));
    },
    get src() {
      return "";
    },
  } as FakeAudio;

  vi.spyOn(document, "createElement").mockReturnValue(element as unknown as HTMLAudioElement);
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: () => "blob:fake",
    revokeObjectURL: () => {},
  });
  return element;
}

const file = () => new File(["fake"], "track.mp3", { type: "audio/mpeg" });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("readAudioDuration", () => {
  it("returns the file's length, rounded to whole seconds", async () => {
    stubAudio((el) => {
      el.duration = 201.6;
      el.onloadedmetadata?.();
    });
    await expect(readAudioDuration(file())).resolves.toBe(202);
  });

  it("returns null when the file cannot be decoded", async () => {
    stubAudio((el) => el.onerror?.());
    await expect(readAudioDuration(file())).resolves.toBeNull();
  });

  it("returns null for a stream with no fixed length", async () => {
    // A live stream reports Infinity; rounding that would poison the field.
    stubAudio((el) => {
      el.duration = Infinity;
      el.onloadedmetadata?.();
    });
    await expect(readAudioDuration(file())).resolves.toBeNull();
  });

  it("returns null when the duration is not a number", async () => {
    stubAudio((el) => {
      el.duration = NaN;
      el.onloadedmetadata?.();
    });
    await expect(readAudioDuration(file())).resolves.toBeNull();
  });

  it("returns null for a zero-length file", async () => {
    stubAudio((el) => {
      el.duration = 0;
      el.onloadedmetadata?.();
    });
    await expect(readAudioDuration(file())).resolves.toBeNull();
  });

  it("settles only once, even if the element reports twice", async () => {
    // An element that fires both metadata and error must not leave a dangling
    // promise or resolve to the second value.
    stubAudio((el) => {
      el.duration = 30;
      el.onloadedmetadata?.();
      el.onerror?.();
    });
    await expect(readAudioDuration(file())).resolves.toBe(30);
  });
});
