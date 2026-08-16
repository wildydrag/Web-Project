import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarGradient } from "@/lib/cover";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => [...p][0] ?? "").join("") || "?";
}

/**
 * Avatar that falls back to a seeded gradient with the user's initials when no
 * photo is set (the brief's "default profile picture" behaviour).
 */
export function UserAvatar({
  name,
  seed,
  url,
  size = "default",
  className,
}: {
  name: string;
  seed: string;
  url?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    // `@container` lets the initials size themselves against the avatar rather
    // than sitting at a fixed 14px inside every circle — they were barely
    // visible in the 128px profile and artist headers.
    <Avatar size={size} className={cn("@container", className)}>
      {url ? <AvatarImage src={url} alt={name} /> : null}
      <AvatarFallback
        style={avatarGradient(seed)}
        // Proportional to the circle, with a floor so the 24px avatars in the
        // header do not end up smaller than they are today.
        className={cn("font-medium text-white text-[max(0.75rem,36cqw)]")}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
