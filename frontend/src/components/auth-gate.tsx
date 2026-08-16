"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { FullScreenLoader } from "@/components/full-screen-loader";
import { useMounted } from "@/lib/hooks/use-mounted";
import { useCurrentUser, useSession } from "@/lib/stores/session-store";
import type { Role } from "@/lib/types";

/** Where a role lands when it isn't allowed on the current route. */
function fallbackFor(role: Role): string {
  return role === "support" || role === "admin" ? "/dashboard" : "/home";
}

/**
 * Client-side route guard for the mock.
 *
 * Redirects signed-out visitors to `/login` and users whose role isn't in
 * `allow` to their home surface. Rendering is gated on {@link useMounted} so the
 * first paint matches the server (the session only exists after hydration).
 */
export function AuthGate({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow?: Role[];
}) {
  const mounted = useMounted();
  const status = useSession((s) => s.status);
  const user = useCurrentUser();
  const router = useRouter();

  const allowed = !allow || (user ? allow.includes(user.role) : false);
  const settling = !mounted || status === "loading";

  useEffect(() => {
    if (settling) return; // wait for session bootstrap to resolve
    if (!user) {
      router.replace("/login");
    } else if (!allowed) {
      router.replace(fallbackFor(user.role));
    }
  }, [settling, user, allowed, router]);

  if (settling || !user || !allowed) {
    return <FullScreenLoader />;
  }
  return <>{children}</>;
}
