"use client";

import Link from "next/link";

import { VerifiedBadge } from "@/components/verified-badge";
import type { Artist } from "@/lib/types";
import { cn } from "@/lib/utils";
import { listSeparator } from "@/lib/format";

/**
 * Renders one or more artists as clickable links (to the artist profile), each
 * with a verified badge when applicable. Used in cards, rows and the player.
 */
export function ArtistLinks({
  artists,
  className,
}: {
  artists: Artist[];
  className?: string;
}) {
  // "، " in Persian, ", " in English.
  const separator = listSeparator().trimEnd();
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-1", className)}>
      {artists.map((artist, i) => (
        <span key={artist.id} className="inline-flex items-center gap-0.5">
          <Link
            href={`/artist/${artist.id}`}
            className="truncate hover:text-foreground hover:underline"
          >
            {artist.name}
          </Link>
          {artist.verified ? <VerifiedBadge className="size-3.5" /> : null}
          {i < artists.length - 1 ? <span aria-hidden>{separator}</span> : null}
        </span>
      ))}
    </span>
  );
}
