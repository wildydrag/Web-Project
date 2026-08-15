"use client";

/**
 * "Made for you" row (bonus feature).
 *
 * Suggestions are computed by the backend from the listener's own play history;
 * each card shows the reason it was picked, so the recommendation is visibly
 * explainable rather than random.
 */

import { Sparkles } from "lucide-react";

import { MediaGrid } from "@/components/catalog/media-grid";
import { SongCard } from "@/components/catalog/song-card";
import { SectionHeader } from "@/components/section-header";
import { useApiResource } from "@/lib/api/hooks";
import type { Song } from "@/lib/types";
import { useT } from "@/lib/i18n";

interface Recommendation {
  song: Song;
  /** A template such as `"چون {artist} را دنبال می‌کنید"` — not a finished
   *  sentence, so it can be shown in either language. */
  reason: string;
  reasonArgs: Record<string, string>;
  score: number;
}

/**
 * Arguments that name part of the interface's own vocabulary, and so should be
 * translated along with the sentence around them.
 *
 * `artist` is deliberately absent: an artist's name is catalogue data, not
 * interface text, and stays as the artist wrote it in both languages. Passing
 * it through the dictionary would translate only the handful of names that
 * happen to appear there, giving "Because you follow Benyamin" next to
 * "Because you follow مهتاب".
 */
const TRANSLATABLE_ARGS = new Set(["genre"]);

function translateArgs(
  args: Record<string, string> | undefined,
  t: (text: string) => string,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(args ?? {}).map(([key, value]) => [
      key,
      TRANSLATABLE_ARGS.has(key) ? t(value) : value,
    ]),
  );
}

export function RecommendationsSection() {
  const t = useT();
  const { data } = useApiResource<Recommendation[]>("/recommendations/");
  const items = data ?? [];
  if (items.length === 0) return null;

  const context = items.map((item) => item.song.id);

  return (
    <section>
      <SectionHeader
        title={t("پیشنهاد برای شما")}
        description={t("بر اساس آهنگ‌هایی که گوش داده‌اید")}
      />
      <MediaGrid>
        {items.map((item) => (
          <div key={item.song.id}>
            <SongCard song={item.song} context={context} />
            <p className="mt-1 flex items-start gap-1 px-2 text-[11px] leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
              {/* The arguments are translated too: a genre name has an English
                  form, while an artist's name is not in the dictionary and so
                  falls through unchanged — which is what we want. */}
              <span className="min-w-0">
                {t(item.reason, translateArgs(item.reasonArgs, t))}
              </span>
            </p>
          </div>
        ))}
      </MediaGrid>
    </section>
  );
}
