"use client";

import { UserCheck, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDb } from "@/lib/stores/db-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { useT } from "@/lib/i18n";

/** Toggles whether the current user follows an artist (or another user). */
export function FollowButton({
  targetId,
  size = "default",
}: {
  targetId: string;
  size?: "sm" | "default" | "lg";
}) {
  const t = useT();
  const user = useCurrentUser();
  const toggleFollow = useDb((s) => s.toggleFollow);

  if (!user || user.id === targetId) return null;
  const following = user.followingIds.includes(targetId);

  return (
    <Button
      size={size}
      variant={following ? "outline" : "default"}
      onClick={() => toggleFollow(user.id, targetId)}
    >
      {following ? (
        <>
          <UserCheck />
          {t("دنبال می‌کنید")}
        </>
      ) : (
        <>
          <UserPlus />
          {t("دنبال کردن")}
        </>
      )}
    </Button>
  );
}
