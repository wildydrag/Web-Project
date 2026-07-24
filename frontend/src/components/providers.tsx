"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";

import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useSession } from "@/lib/stores/session-store";

/**
 * App-wide client providers. Kept as a thin client boundary so the root layout
 * can stay a Server Component.
 *
 * - `ThemeProvider` toggles the `.dark` class on <html> (controlled from Settings).
 * - `TooltipProvider` is required once near the root for Base UI tooltips.
 * - `Toaster` renders Sonner notifications.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const bootstrap = useSession((s) => s.bootstrap);

  // Restore a session from a stored token (and hydrate data) on first load.
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delay={250}>{children}</TooltipProvider>
      <Toaster position="top-center" />
      <ServiceWorkerRegister />
    </ThemeProvider>
  );
}
