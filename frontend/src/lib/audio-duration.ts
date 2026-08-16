"use client";

/**
 * Read how long an audio file actually is, in seconds.
 *
 * Artists used to type the duration by hand for every track, which is busywork
 * and is usually a little wrong — and the number matters, because it is what
 * the player and the catalogue display. The browser already knows the answer
 * once it has the file's metadata, so we ask it.
 *
 * Resolves to `null` when the duration cannot be determined (an unsupported
 * codec, a corrupt file, or a stream with no fixed length). Callers should keep
 * whatever the user typed in that case rather than overwriting it with a guess.
 */
export function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    // `document` is absent during server rendering; nothing to measure there.
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }

    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    let settled = false;

    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const { duration } = audio;
      // A live stream reports Infinity, and a failed decode reports NaN.
      finish(Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null);
    };
    audio.onerror = () => finish(null);

    // Never leave the caller waiting on a file the browser will not decode.
    setTimeout(() => finish(null), 10_000);

    audio.src = url;
  });
}
