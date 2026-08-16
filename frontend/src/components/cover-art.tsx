import { cn } from "@/lib/utils";
import { coverGradient, coverInitial } from "@/lib/cover";

/**
 * Square cover for albums, songs and playlists. Renders the real uploaded
 * image when `url` is set; otherwise falls back to a seeded gradient with a
 * faint initial of the title so items still look visually distinct.
 */
export function CoverArt({
  seed,
  url,
  label,
  className,
  rounded = "rounded-xl",
}: {
  seed: string;
  /** Absolute URL to a real uploaded cover image, if one exists. */
  url?: string | null;
  label?: string;
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      style={coverGradient(seed)}
      className={cn(
        "relative flex aspect-square items-center justify-center overflow-hidden shadow-sm",
        rounded,
        className,
      )}
      aria-hidden
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote, user-uploaded media served by the Django backend
        <img src={url} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <>
          {label ? (
            <span className="select-none font-heading text-4xl font-bold text-white/25">
              {coverInitial(label)}
            </span>
          ) : null}
          {/* Subtle sheen so flat gradients feel a little more like artwork. */}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-white/10" />
        </>
      )}
    </div>
  );
}