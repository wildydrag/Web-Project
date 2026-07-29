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

interface Recommendation {
  song: Song;
  reason: string;
  score: number;
}

export function RecommendationsSection() {
  const { data } = useApiResource<Recommendation[]>("/recommendations/");
  const items = data ?? [];
  if (items.length === 0) return null;

  const context = items.map((item) => item.song.id);

  return (
    <section>
      <SectionHeader
        title="پیشنهاد برای شما"
        description="بر اساس آهنگ‌هایی که گوش داده‌اید"
      />
      <MediaGrid>
        {items.map((item) => (
          <div key={item.song.id}>
            <SongCard song={item.song} context={context} />
            <p className="mt-1 flex items-start gap-1 px-2 text-[11px] leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
              <span className="min-w-0">{item.reason}</span>
            </p>
          </div>
        ))}
      </MediaGrid>
    </section>
  );
}
