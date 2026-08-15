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
    <Avatar size={size} className={className}>
      {url ? <AvatarImage src={url} alt={name} /> : null}
      <AvatarFallback
        style={avatarGradient(seed)}
        className={cn("font-medium text-white")}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
